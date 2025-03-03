'use client';
import { useState, useEffect } from 'react';
import { UserPlus, Check, X, Music, MessageCircle } from 'lucide-react';
import Sidebar from "../../components/ui/sidebar";
import Navbar from "../../components/ui/navbar";

interface User {
  id: number;
  name: string;
  avatar: string;
  matchPercentage: number;
  commonArtists: string[];
  topSong: string;
  status: 'none' | 'pending' | 'friends';
}

interface FriendRequest {
  id: number;
  from: {
    id: number;
    name: string;
    avatar: string;
  };
  status: 'pending' | 'accepted' | 'declined';
  date: string;
}

export default function FindPeoplePage() {
  const [similarUsers, setSimilarUsers] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'discover' | 'requests' | 'friends'>('discover');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch similar users from backend
    const fetchSimilarUsers = async () => {
      setIsLoading(true);
      try {
        // Replace with actual API endpoint
        const response = await fetch('/api/users/similar');
        if (!response.ok) throw new Error('Failed to fetch similar users');
        const data = await response.json();
        setSimilarUsers(data);
      } catch (error) {
        console.error("Error fetching similar users:", error);
        // Fallback mock data in case of error
        setSimilarUsers([
          {
            id: 1,
            name: "Alex Johnson",
            avatar: "/api/placeholder/64/64",
            matchPercentage: 87,
            commonArtists: ["The Weeknd", "Dua Lipa"],
            topSong: "Blinding Lights",
            status: 'none'
          },
          {
            id: 2,
            name: "Jamie Smith",
            avatar: "/api/placeholder/64/64",
            matchPercentage: 82,
            commonArtists: ["Harry Styles", "Billie Eilish"],
            topSong: "As It Was",
            status: 'pending'
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch friend requests from backend
    const fetchFriendRequests = async () => {
      try {
        // Replace with actual API endpoint
        const response = await fetch('/api/friends/requests');
        if (!response.ok) throw new Error('Failed to fetch friend requests');
        const data = await response.json();
        setFriendRequests(data);
      } catch (error) {
        console.error("Error fetching friend requests:", error);
      }
    };

    fetchSimilarUsers();
    fetchFriendRequests();
  }, []);

  const handleSendRequest = async (userId: number) => {
    try {
      // Replace with actual API endpoint
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) throw new Error('Failed to send friend request');
      
      // Update local state on success
      setSimilarUsers(users => 
        users.map(user => 
          user.id === userId ? {...user, status: 'pending'} : user
        )
      );
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      // Replace with actual API endpoint
      const response = await fetch(`/api/friends/request/${requestId}/accept`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to accept friend request');
      
      // Update local state on success
      setFriendRequests(requests => 
        requests.map(request => 
          request.id === requestId ? {...request, status: 'accepted'} : request
        )
      );
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleDeclineRequest = async (requestId: number) => {
    try {
      // Replace with actual API endpoint
      const response = await fetch(`/api/friends/request/${requestId}/decline`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to decline friend request');
      
      // Update local state on success
      setFriendRequests(requests => 
        requests.filter(request => request.id !== requestId)
      );
    } catch (error) {
      console.error("Error declining friend request:", error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'discover':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div 
                  key={index} 
                  className="bg-[#74686e]/20 animate-pulse rounded-md p-6 h-48"
                ></div>
              ))
            ) : (
              similarUsers
                .filter(user => user.status !== 'friends')
                .map(user => (
                  <div key={user.id} className="bg-[#74686e] rounded-md p-4 shadow-md">
                    <div className="flex items-start">
                      <img 
                        src={user.avatar} 
                        alt={`${user.name}'s avatar`} 
                        className="w-16 h-16 rounded-full mr-4"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-white text-lg">{user.name}</h3>
                          <span className="bg-pink-500 text-white px-2 py-1 rounded-full text-xs">
                            {user.matchPercentage}% Match
                          </span>
                        </div>
                        <div className="mt-2 text-white/80 text-sm">
                          <p className="flex items-center"><Music size={14} className="mr-1" /> Top song: {user.topSong}</p>
                          <p className="mt-1">Common artists: {user.commonArtists.join(', ')}</p>
                        </div>
                        <div className="mt-3 flex justify-end">
                          {user.status === 'none' ? (
                            <button 
                              onClick={() => handleSendRequest(user.id)}
                              className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition duration-200"
                            >
                              <UserPlus size={16} className="mr-1" />
                              Send Request
                            </button>
                          ) : user.status === 'pending' ? (
                            <span className="text-white/70 text-sm italic">Request Sent</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        );
        
      case 'requests':
        return (
          <div className="bg-[#74686e] rounded-md p-6 shadow-md">
            <h3 className="text-xl font-semibold text-white mb-4">Friend Requests</h3>
            
            {friendRequests.length === 0 ? (
              <p className="text-white/70 text-center py-4">No pending friend requests</p>
            ) : (
              <div className="space-y-4">
                {friendRequests.map(request => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-[#543c43]/50 rounded-md">
                    <div className="flex items-center">
                      <img 
                        src={request.from.avatar} 
                        alt={`${request.from.name}'s avatar`} 
                        className="w-12 h-12 rounded-full mr-3"
                      />
                      <div>
                        <h4 className="font-medium text-white">{request.from.name}</h4>
                        <p className="text-xs text-white/70">Sent on {new Date(request.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleAcceptRequest(request.id)}
                        className="bg-green-500 hover:bg-green-600 p-2 rounded-full text-white transition duration-200"
                      >
                        <Check size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeclineRequest(request.id)}
                        className="bg-red-500 hover:bg-red-600 p-2 rounded-full text-white transition duration-200"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        
      case 'friends':
        return (
          <div className="bg-[#74686e] rounded-md p-6 shadow-md">
            <h3 className="text-xl font-semibold text-white mb-4">Your Friends</h3>
            
            {similarUsers.filter(user => user.status === 'friends').length === 0 ? (
              <p className="text-white/70 text-center py-4">You haven't connected with any music friends yet</p>
            ) : (
              <div className="space-y-4">
                {similarUsers
                  .filter(user => user.status === 'friends')
                  .map(friend => (
                    <div key={friend.id} className="flex items-center justify-between p-3 bg-[#543c43]/50 rounded-md">
                      <div className="flex items-center">
                        <img 
                          src={friend.avatar} 
                          alt={`${friend.name}'s avatar`} 
                          className="w-12 h-12 rounded-full mr-3"
                        />
                        <div>
                          <h4 className="font-medium text-white">{friend.name}</h4>
                          <p className="text-xs text-white/70">
                            {friend.matchPercentage}% music match
                          </p>
                        </div>
                      </div>
                      <button className="bg-blue-500 hover:bg-blue-600 p-2 rounded-full text-white transition duration-200">
                        <MessageCircle size={18} />
                      </button>
                    </div>
                  ))
              }
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen text-black">
      {/* Navbar */}
      <div className='bg-[#74686e]'>
        <Navbar />
      </div>
      
      {/* Sidebar component */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-[#151b27]">
        {/* Header */}
        <div className="p-8">
          <h1 className="text-3xl text-blue-700 font-bold mb-4">Find People Like You</h1>
          <p className="text-pink-600">Connect with users who share your music taste</p>
        </div>

        {/* Tabs */}
        <div className="px-8 pb-4">
          <div className="flex space-x-4 border-b border-[#74686e]/30">
            <button 
              onClick={() => setActiveTab('discover')}
              className={`py-2 px-4 font-medium transition-colors duration-200 ${
                activeTab === 'discover' 
                  ? 'text-pink-500 border-b-2 border-pink-500' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Discover People
            </button>
            <button 
              onClick={() => setActiveTab('requests')}
              className={`py-2 px-4 font-medium transition-colors duration-200 relative ${
                activeTab === 'requests' 
                  ? 'text-pink-500 border-b-2 border-pink-500' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Friend Requests
              {friendRequests.length > 0 && (
                <span className="absolute top-0 right-0 bg-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {friendRequests.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('friends')}
              className={`py-2 px-4 font-medium transition-colors duration-200 ${
                activeTab === 'friends' 
                  ? 'text-pink-500 border-b-2 border-pink-500' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Your Friends
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 pt-2">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}