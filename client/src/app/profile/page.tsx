'use client';
import { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Sidebar from "../../components/ui/sidebar";
import Navbar from "../../components/ui/navbar";

// Define TypeScript interfaces
interface UserData {
  id: string;
  name: string;
  username: string;
  pronouns?: string;
  bio?: string;
  profilePicture?: string;
  avatar?: string;
  gender?: string;
  links?: string[];
  banners?: string[];
  musicProfile?: string;
}

const ProfilePage: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const router = useRouter();

  // Fetch user data from Django API
  useEffect(() => {
    const fetchUserData = async (): Promise<void> => {
      try {
        const token = localStorage.getItem('access_token');
        
        if (!token) {
          router.push('/login');
          return;
        }
        
        const response = await fetch('http://127.0.0.1:8000/profile/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data: UserData = await response.json();
          setUserData(data);
        } else {
          console.error('Failed to fetch user data');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleBack = (): void => {
    router.back();
  };

  const handleEditToggle = (): void => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserData((prevData) => prevData ? { ...prevData, [name]: value } : null);
  };

  const handleArrayChange = (e: ChangeEvent<HTMLInputElement>, field: 'links' | 'banners') => {
    const { value } = e.target;
    setUserData((prevData) => prevData ? { ...prevData, [field]: value.split(', ') } : null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center items-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#151b27] text-white flex flex-col items-center justify-center">
      <Navbar />
      <div className="flex w-full">
        <Sidebar />
        <div className="w-full max-w-3xl mx-auto p-4">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            {/* Header with back button */}
            <div className="flex items-center mb-4">
              <button onClick={handleBack} className="p-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold ml-4">Edit profile</h1>
              <button onClick={handleEditToggle} className="ml-auto bg-blue-500 text-white px-4 py-2 rounded">
                {isEditing ? 'Save' : 'Edit'}
              </button>
            </div>

            <div className="border-b border-gray-700 pb-8">
              {/* Profile pictures section */}
              <div className="flex justify-center mb-4">
                <div className="relative mr-6">
                  {userData?.profilePicture ? (
                    <Image 
                      src={userData.profilePicture} 
                      alt="Profile picture" 
                      width={100} 
                      height={100} 
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-700"></div>
                  )}
                </div>
                <div className="relative">
                  {userData?.avatar ? (
                    <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center">
                      <Image 
                        src={userData.avatar} 
                        alt="Avatar" 
                        width={48} 
                        height={48}
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center mb-6">
                <button className="text-blue-400 text-lg">Edit picture or avatar</button>
              </div>

              {/* User info section */}
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                  <span className="text-lg flex-1">Name</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={userData?.name || ''}
                      onChange={handleInputChange}
                      className="bg-gray-800 text-white rounded p-2 ml-2 flex-1"
                    />
                  ) : (
                    <span className="text-gray-300 flex-1 text-right">{userData?.name ? userData.name : 'Add name'}</span>
                  )}
                </div>

                <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                  <span className="text-lg flex-1">Username</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="username"
                      value={userData?.username || ''}
                      onChange={handleInputChange}
                      className="bg-gray-800 text-white rounded p-2 ml-2 flex-1"
                    />
                  ) : (
                    <span className="text-gray-300 flex-1 text-right">{userData?.username ? userData.username : 'Add username'}</span>
                  )}
                </div>

                <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                  <span className="text-lg flex-1">Pronouns</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="pronouns"
                      value={userData?.pronouns || ''}
                      onChange={handleInputChange}
                      className="bg-gray-800 text-white rounded p-2 ml-2 flex-1"
                    />
                  ) : (
                    <span className="text-gray-300 flex-1 text-right">{userData?.pronouns ? userData.pronouns : 'Pronouns'}</span>
                  )}
                </div>

                <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                  <span className="text-lg flex-1">Bio</span>
                  {isEditing ? (
                    <textarea
                      name="bio"
                      value={userData?.bio || ''}
                      onChange={handleInputChange}
                      className="bg-gray-800 text-white rounded p-2 ml-2 flex-1"
                    />
                  ) : (
                    <span className="text-gray-300 flex-1 text-right">{userData?.bio ? userData.bio : 'Add bio'}</span>
                  )}
                </div>

                <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                  <span className="text-lg flex-1">Links</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="links"
                      value={userData?.links?.join(', ') || ''}
                      onChange={(e) => handleArrayChange(e, 'links')}
                      className="bg-gray-800 text-white rounded p-2 ml-2 flex-1"
                    />
                  ) : (
                    <span className="text-gray-300 flex-1 text-right">{userData?.links ? userData.links.join(', ') : 'Add links'}</span>
                  )}
                </div>

                <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                  <span className="text-lg flex-1">Banners</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="banners"
                      value={userData?.banners?.join(', ') || ''}
                      onChange={(e) => handleArrayChange(e, 'banners')}
                      className="bg-gray-800 text-white rounded p-2 ml-2 flex-1"
                    />
                  ) : (
                    <span className="text-gray-300 flex-1 text-right">{userData?.banners ? userData.banners.join(', ') : 'Add banners'}</span>
                  )}
                </div>

                <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                  <span className="text-lg flex-1">Music</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="musicProfile"
                      value={userData?.musicProfile || ''}
                      onChange={handleInputChange}
                      className="bg-gray-800 text-white rounded p-2 ml-2 flex-1"
                    />
                  ) : (
                    <span className="text-gray-300 flex-1 text-right">{userData?.musicProfile ? userData.musicProfile : 'Add music to your profile'}</span>
                  )}
                </div>

                <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                  <span className="text-lg flex-1">Gender</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="gender"
                      value={userData?.gender || ''}
                      onChange={handleInputChange}
                      className="bg-gray-800 text-white rounded p-2 ml-2 flex-1"
                    />
                  ) : (
                    <span className="text-gray-300 flex-1 text-right">{userData?.gender ? userData.gender : 'Not specified'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Additional options */}
            <div className="mt-6 space-y-6">
              <button className="text-blue-400 text-lg block w-full text-left">
                Switch to professional account
              </button>
              <button className="text-blue-400 text-lg block w-full text-left">
                Personal information settings
              </button>
              <button className="text-blue-400 text-lg block w-full text-left">
                Show your profile is verified
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;