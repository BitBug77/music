import math
from collections import defaultdict
from django.db.models import Count, Q, F, Sum
from .models import Action, Song, Recommendation, UserProfile, UserSimilarity
from django.contrib.auth.models import User
import math, random
from django.utils import timezone
from .models import Action, UserProfile
from django.db.models import Count, Avg
import math
def update_user_similarities(user):
    """
    Update similarity scores between the given user and all other users
    Stores results in the UserSimilarity model for faster retrieval
    """
    other_users = User.objects.exclude(id=user.id)
    
    for other_user in other_users:
        similarity = calculate_user_similarity(user, other_user)
        
        # Update or create the similarity record using your existing model structure
        UserSimilarity.objects.update_or_create(
            user1=user, 
            user2=other_user,
            defaults={'similarity_score': similarity}
        )
        
        # Also create the reverse relationship for easier querying
        UserSimilarity.objects.update_or_create(
            user1=other_user, 
            user2=user,
            defaults={'similarity_score': similarity}
        )


def calculate_user_similarity(user1, user2):
    """
    Improved similarity calculation between users using both action history and preferences.
    """
    # Get actions for both users
    user1_actions = Action.objects.filter(user=user1)
    user2_actions = Action.objects.filter(user=user2)

    # Find common songs both users interacted with
    common_songs = set(user1_actions.values_list('song', flat=True)) & set(user2_actions.values_list('song', flat=True))

    if not common_songs:
        return 0  # No common interactions, similarity is 0

    # Weight different actions differently
    action_weights = {
        'share': 5.0,  # Updated weight for "share" action
        'like': 3.0,
        'save': 4.0,
        'play': 1.0
    }

    # Calculate weighted action similarity
    similarity_score = 0

    for song_id in common_songs:
        user1_song_actions = user1_actions.filter(song_id=song_id)
        user2_song_actions = user2_actions.filter(song_id=song_id)

        for action_type, weight in action_weights.items():
            u1_action = user1_song_actions.filter(action_type=action_type).first()
            u2_action = user2_song_actions.filter(action_type=action_type).first()

            if u1_action and u2_action:
                # Calculate days since action
                days_u1 = (timezone.now() - u1_action.timestamp).days if u1_action.timestamp else 0
                days_u2 = (timezone.now() - u2_action.timestamp).days if u2_action.timestamp else 0

                # Apply time decay (more recent actions get higher weight)
                time_weight_u1 = math.exp(-0.01 * days_u1)  # Exponential decay
                time_weight_u2 = math.exp(-0.01 * days_u2)

                similarity_score += weight * time_weight_u1 * time_weight_u2

    # Normalize by the total number of actions
    denominator = math.sqrt(len(user1_actions) * len(user2_actions))

    if denominator == 0:
        return 0  # Avoid division by zero

    # Also consider user preference similarity
    try:
        user1_profile = UserProfile.objects.get(user=user1)
        user2_profile = UserProfile.objects.get(user=user2)

        # Consider favorite artists similarity
        user1_artists = set(user1_profile.preferences.get('favorite_artists', []))
        user2_artists = set(user2_profile.preferences.get('favorite_artists', []))

        if user1_artists and user2_artists:
            artist_similarity = len(user1_artists & user2_artists) / math.sqrt(len(user1_artists) * len(user2_artists))
            similarity_score += artist_similarity * 2  # Weighted contribution
    except UserProfile.DoesNotExist:
        pass  # If profiles don't exist, skip this part

    return similarity_score / denominator


def get_similar_users(user, top_n=10):
    """
    Gets similar users using the pre-calculated similarity scores
    """
    update_preferences_based_on_actions(user)
    # Using your existing model structure with user1 and user2 relationship names
    similar_users = UserSimilarity.objects.filter(
        user1=user
    ).select_related('user2').order_by('-similarity_score')[:top_n]
    
    return [(sim.user2, sim.similarity_score) for sim in similar_users]

def recommend_songs_collaborative(user, limit=50):
    """
    Enhanced collaborative filtering recommendation that gives higher weight to
    songs liked by users who are more similar to the target user
    """
    update_preferences_based_on_actions(user)
    similar_users = get_similar_users(user)
    
    # Keep track of scores for each recommended song
    song_scores = defaultdict(float)
    
    # Get songs the user has already interacted with
    user_song_ids = set(Action.objects.filter(user=user).values_list('song_id', flat=True))
    
    for similar_user, similarity_score in similar_users:
        if similarity_score <= 0:
            continue
            
        # Get actions for this similar user
        actions = Action.objects.filter(user=similar_user)
        
        for action in actions:
            # Skip songs the user has already interacted with
            if action.song_id in user_song_ids:
                continue
                
            # Weight based on action type
            action_weight = 1.0
            if action.action_type == 'like':
                action_weight = 5.0
            elif action.action_type == 'save':
                action_weight = 3.0
                
            # Add to the song's score, weighted by similarity and action type
            song_scores[action.song_id] += similarity_score * action_weight
    
    # Convert to list of (song_id, score) tuples and sort by score
    scored_songs = [(song_id, score) for song_id, score in song_scores.items()]
    scored_songs.sort(key=lambda x: x[1], reverse=True)
    
    # Get the top songs
    top_song_ids = [song_id for song_id, _ in scored_songs[:limit]]
    recommended_songs = list(Song.objects.filter(id__in=top_song_ids))
    
    # Sort the songs according to their scores
    song_id_to_index = {song_id: i for i, song_id in enumerate(top_song_ids)}
    recommended_songs.sort(key=lambda song: song_id_to_index.get(song.id, 9999))
    
    return recommended_songs, song_scores

def recommend_songs_content_based(user, limit=50):
    """
    Enhanced content-based filtering that considers more factors than just artists
    """
    try:
        user_profile = UserProfile.objects.get(user=user)
    except UserProfile.DoesNotExist:
        return [], {}
    
    song_scores = defaultdict(float)
    
    # Get songs the user has already interacted with
    user_song_ids = set(Action.objects.filter(user=user).values_list('song_id', flat=True))
    
    # Recommend based on favorite artists
    favorite_artists = user_profile.preferences.get('favorite_artists', [])
    if favorite_artists:
        artist_songs = Song.objects.filter(artist__in=favorite_artists).exclude(id__in=user_song_ids)
        for song in artist_songs:
            song_scores[song.id] += 5.0
    
    # Get user's most listened genres from their action history
    user_actions = Action.objects.filter(user=user)
    genre_counts = defaultdict(int)
    
    for action in user_actions:
        song_genres = getattr(action.song, 'genres', [])
        if song_genres:
            for genre in song_genres:
                genre_counts[genre] += 1
    
    # Get top genres
    top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    top_genres = [genre for genre, _ in top_genres]
    
    # Recommend songs with matching genres
    if top_genres:
        for song in Song.objects.exclude(id__in=user_song_ids):
            song_genres = getattr(song, 'genres', [])
            if song_genres:
                matching_genres = set(song_genres) & set(top_genres)
                song_scores[song.id] += len(matching_genres) * 2.0
    
    # Convert to list of (song_id, score) tuples and sort by score
    scored_songs = [(song_id, score) for song_id, score in song_scores.items()]
    scored_songs.sort(key=lambda x: x[1], reverse=True)
    
    # Get the top songs
    top_song_ids = [song_id for song_id, _ in scored_songs[:limit]]
    recommended_songs = list(Song.objects.filter(id__in=top_song_ids))
    
    # Sort the songs according to their scores
    song_id_to_index = {song_id: i for i, song_id in enumerate(top_song_ids)}
    recommended_songs.sort(key=lambda song: song_id_to_index.get(song.id, 9999))
    
    return recommended_songs, song_scores

def recommend_songs_combined(user, limit=50):
    """
    Combines collaborative and content-based recommendations
    """
    # Get recommendations from both methods
    collab_songs, collab_scores = recommend_songs_collaborative(user)
    content_songs, content_scores = recommend_songs_content_based(user)
    
    # Combine scores from both methods
    combined_scores = defaultdict(float)
    
    # Add collaborative scores (weighted higher)
    for song_id, score in collab_scores.items():
        combined_scores[song_id] += score * 0.7
    
    # Add content-based scores
    for song_id, score in content_scores.items():
        combined_scores[song_id] += score * 0.3
    
    # Convert to list of (song_id, score) tuples and sort by score
    scored_songs = [(song_id, score) for song_id, score in combined_scores.items()]
    scored_songs.sort(key=lambda x: x[1], reverse=True)
    
    # Get the top songs
    top_song_ids = [song_id for song_id, _ in scored_songs[:limit]]
    recommended_songs = list(Song.objects.filter(id__in=top_song_ids))
    
    # Sort the songs according to their scores
    song_id_to_index = {song_id: i for i, song_id in enumerate(top_song_ids)}
    recommended_songs.sort(key=lambda song: song_id_to_index.get(song.id, 9999))
    
    return recommended_songs, combined_scores

def calculate_recommendation_scores(user):
    """
    Calculate and store recommendation scores for all potential songs for a user
    """
    update_preferences_based_on_actions(user)

    # Get all songs
    all_songs = Song.objects.all()

    # Get songs the user has already interacted with
    user_actions = Action.objects.filter(user=user)
    user_song_ids = set(user_actions.values_list('song_id', flat=True))

    # Get recommendations from combined method
    _, combined_scores = recommend_songs_combined(user)

    # Calculate explicit user feature-based scores
    try:
        user_profile = UserProfile.objects.get(user=user)
        favorite_artists = user_profile.preferences.get('favorite_artists', [])
    except UserProfile.DoesNotExist:
        favorite_artists = []

    # For each song, calculate and store recommendation score
    for song in all_songs:
        # Skip songs the user has already interacted with
        if song.id in user_song_ids:
            continue

        score = combined_scores.get(song.id, 0)

        # Add additional score if the song is by a favorite artist
        if song.artist in favorite_artists:
            score += 5

        # Update or create recommendation record
        Recommendation.objects.update_or_create(
            user=user,
            song=song,
            defaults={'recommendation_score': score}
        )

    # Also recalculate scores for songs the user has interacted with but may want to engage with more
    for action in user_actions:
        score = 0

        # Base score on action type
        if action.action_type == 'like':
            score += 3
        elif action.action_type == 'save':
            score += 2
        elif action.action_type == 'play':
            score += 1

        # Boost score if by favorite artist
        if action.song.artist in favorite_artists:
            score += 3

        # Update recommendation score
        Recommendation.objects.update_or_create(
            user=user,
            song=action.song,
            defaults={'recommendation_score': score}
        )

    # Calculate the average play count
    average_play_count = Action.objects.filter(
        action_type='play'
    ).values('song').annotate(
        play_count=Count('id')
    ).aggregate(avg_play_count=Avg('play_count'))['avg_play_count']

    if average_play_count is not None:
        # For each recommendation
        for recommendation in Recommendation.objects.filter(user=user):
            # Get play count for this song
            song_play_count = Action.objects.filter(
                song=recommendation.song,
                action_type='play'
            ).count()

            # Calculate popularity normalization factor
            if song_play_count > average_play_count:
                popularity_factor = math.log(average_play_count) / math.log(max(1, song_play_count))

                # Apply correction (reduce score for very popular songs)
                recommendation.recommendation_score *= popularity_factor
                recommendation.save()

def update_preferences_based_on_actions(user):
    """
    Automatically updates the user preferences based on their interaction history.
    The function analyzes the user's actions (likes, saves, plays) to update their preferences.
    """
    # Get all actions of the user (e.g., likes, saves, plays)
    actions = Action.objects.filter(user=user)
    
    # Track frequency of artists and genres the user interacts with
    artist_count = defaultdict(int)
    genre_count = defaultdict(int)

    for action in actions:
        song = action.song
        # Count favorite artists
        if song.artist:  # Check if artist exists
            artist_count[song.artist] += 1

        # Count favorite genres - fix the error here
        # The issue is that you're trying to access song.genre, but in your model
        # the field might be called song.genres (plural) or it's None
        # Let's handle both cases:
        
        genres = getattr(song, 'genres', None) or getattr(song, 'genre', None) or []
        
        # Make sure genres is iterable even if it's a string or None
        if isinstance(genres, str):
            genres = [genres]
        elif genres is None:
            genres = []
            
        for genre in genres:
            genre_count[genre] += 1

    # Identify top artists and genres based on the user's interaction frequency
    favorite_artists = sorted(artist_count, key=artist_count.get, reverse=True)[:5]
    favorite_genres = sorted(genre_count, key=genre_count.get, reverse=True)[:5]

    # Get the user's profile and update preferences
    try:
        user_profile = UserProfile.objects.get(user=user)
    except UserProfile.DoesNotExist:
        user_profile = UserProfile.objects.create(user=user)

    # Initialize preferences if it doesn't exist
    if not hasattr(user_profile, 'preferences') or user_profile.preferences is None:
        user_profile.preferences = {}

    # Update the preferences field with the updated favorites
    user_profile.preferences['favorite_artists'] = favorite_artists
    user_profile.preferences['favorite_genres'] = favorite_genres

    # Save the updated user profile
    user_profile.save()


def diversify_recommendations(recommendations, diversity_factor=0.2):
    """
    Add diversity to recommendations by including some less obvious choices
    """
    # Sort by score
    recommendations.sort(key=lambda x: x[1], reverse=True)
    
    # Take top 80% from sorted recommendations
    top_count = int(len(recommendations) * (1 - diversity_factor))
    top_recommendations = recommendations[:top_count]
    
    # Take 20% random picks from the rest
    rest = recommendations[top_count:]
    if rest:
        random_picks = random.sample(rest, min(len(rest), int(len(recommendations) * diversity_factor)))
        diverse_recommendations = top_recommendations + random_picks
        return diverse_recommendations
    
    return top_recommendations

def get_trending_songs(days=7, limit=20):
    """
    Get trending songs based on recent activity
    """
    # Define the timeframe for trending
    recent_date = timezone.now() - timezone.timedelta(days=days)
    
    # Get songs with most actions in the recent timeframe
    trending = Action.objects.filter(
        timestamp__gte=recent_date
    ).values('song').annotate(
        action_count=Count('id')
    ).order_by('-action_count')[:limit]
    
    # Get the actual songs
    song_ids = [item['song'] for item in trending]
    songs = Song.objects.filter(id__in=song_ids)
    
    # Sort by popularity
    song_id_to_count = {item['song']: item['action_count'] for item in trending}
    return sorted(songs, key=lambda s: song_id_to_count.get(s.id, 0), reverse=True)



def assign_recommendation_strategy(user):
    """
    Assign a recommendation strategy to a user for A/B testing
    """
    # Get or create user's experiment group
    try:
        profile = UserProfile.objects.get(user=user)
        
        if 'experiment_group' not in profile.preferences:
            # Randomly assign to a group (A or B)
            group = random.choice(['A', 'B'])
            profile.preferences['experiment_group'] = group
            profile.save()
        
        return profile.preferences['experiment_group']
        
    except UserProfile.DoesNotExist:
        return 'A'  # Default group
    


    




