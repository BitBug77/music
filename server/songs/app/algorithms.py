import math
from collections import defaultdict
from django.db.models import Count
from .models import Action, Song, Recommendation, UserProfile, UserSimilarity
from django.contrib.auth.models import User
def recommend_songs_collaborative(user):
    """Collaborative filtering recommendation"""
    # Get similar users and calculate song recommendations based on their actions
    similar_users = get_similar_users(user)
    recommended_songs = []

    for similar_user, similarity_score in similar_users:
        user_actions = Action.objects.filter(user=similar_user)
        for action in user_actions:
            if action.action_type in ['like', 'save']:
                recommended_songs.append(action.song)

    # Deduplicate and return the recommended songs
    recommended_songs = list(set(recommended_songs))
    return recommended_songs


def recommend_songs_content_based(user):
    """Content-based filtering recommendation"""
    # Importing locally to avoid circular import issues
    from .models import Song

    recommended_songs = []
    user_profile = UserProfile.objects.get(user=user)

    # Recommend songs based on user preferences (for example, favorite artists)
    favorite_artists = user_profile.preferences.get('favorite_artists', [])
    songs = Song.objects.filter(artist__in=favorite_artists)

    recommended_songs.extend(songs)
    return recommended_songs


def calculate_recommendation_score(user, song):
    """Calculates the recommendation score for a given song and user"""
    score = 0

    actions = Action.objects.filter(user=user, song=song)
    for action in actions:
        if action.action_type == 'like':
            score += 10
        elif action.action_type == 'save':
            score += 5
        elif action.action_type == 'play':
            score += 1

    user_profile = UserProfile.objects.get(user=user)
    if song.artist in user_profile.preferences.get('favorite_artists', []):
        score += 5

    recommendation, created = Recommendation.objects.get_or_create(user=user, song=song)
    recommendation.recommendation_score = score
    recommendation.save()

    similar_users = get_similar_users(user)
    for similar_user, similarity_score in similar_users:
        similar_user_actions = Action.objects.filter(user=similar_user, song=song)

        for similar_user_action in similar_user_actions:
            if similar_user_action.action_type == 'like':
                score += similarity_score * 10
            elif similar_user_action.action_type == 'save':
                score += similarity_score * 5
            elif similar_user_action.action_type == 'play':
                score += similarity_score * 1

    recommendation.recommendation_score = score
    recommendation.save()


def calculate_user_similarity(user1, user2):
    """Calculates similarity score between two users based on their actions"""
    user1_actions = Action.objects.filter(user=user1)
    user2_actions = Action.objects.filter(user=user2)

    common_songs = set(user1_actions.values_list('song', flat=True)) & set(user2_actions.values_list('song', flat=True))
    if not common_songs:
        return 0

    numerator = sum([1 for song in common_songs])
    denominator = math.sqrt(len(user1_actions) * len(user2_actions))

    return numerator / denominator if denominator != 0 else 0


def get_similar_users(user, top_n=5):
    """Gets the top N most similar users to the given user"""
    other_users = User.objects.exclude(id=user.id)
    user_similarities = []

    for other_user in other_users:
        similarity_score = calculate_user_similarity(user, other_user)
        user_similarities.append((other_user, similarity_score))

    user_similarities.sort(key=lambda x: x[1], reverse=True)
    return user_similarities[:top_n]
