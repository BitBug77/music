"use client"
import { useState, useEffect, type ChangeEvent } from "react"
import type React from "react"

import { useRouter } from "next/navigation"
import Sidebar from "../../components/ui/sidebar"
import Navbar from "../../components/ui/navbar"

// Define TypeScript interfaces
interface UserData {
  username: string
  email: string
  name: string
  pronoun: string
  gender: string
  bio: string
  profile_picture: string | null
  joined_date: string
}

// Define dropdown options
const pronounOptions = [
  { value: "", label: "Select pronouns" },
  { value: "he/him", label: "He/Him" },
  { value: "she/her", label: "She/Her" },
  { value: "they/them", label: "They/Them" },
  { value: "ze/zir", label: "Ze/Zir" },
  { value: "xe/xem", label: "Xe/Xem" },
  { value: "other", label: "Other" },
]

const genderOptions = [
  { value: "", label: "Select gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "transgender", label: "Transgender" },
  { value: "genderqueer", label: "Genderqueer" },
  { value: "genderfluid", label: "Genderfluid" },
  { value: "agender", label: "Agender" },
  { value: "prefer not to say", label: "Prefer not to say" },
  { value: "other", label: "Other" },
]

const ProfilePage: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const router = useRouter()
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false)
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Fetch user data from Django API
  const fetchUserData = async (): Promise<void> => {
    try {
      const token = localStorage.getItem("access_token")

      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch("http://127.0.0.1:8000/profile/", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.status === "success") {
          setUserData(data.profile)
        } else {
          console.error("Failed to fetch user data")
        }
      } else {
        console.error("Failed to fetch user data")
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [router])

  const handleBack = (): void => {
    router.back()
  }

  const handleSaveProfile = async (): Promise<void> => {
    try {
      const token = localStorage.getItem("access_token")

      if (!token || !userData) {
        return
      }

      const response = await fetch("http://127.0.0.1:8000/profile/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: userData.name,
          pronoun: userData.pronoun,
          gender: userData.gender,
          bio: userData.bio,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.status === "success") {
          setIsEditing(false)
          // Refresh user data
          fetchUserData()
        } else {
          console.error("Failed to update profile")
        }
      } else {
        console.error("Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
    }
  }

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedImage(file)

      // Create a preview URL for the selected image
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadProfilePicture = async (): Promise<void> => {
    if (!selectedImage) {
      return
    }

    try {
      const token = localStorage.getItem("access_token")

      if (!token) {
        return
      }

      const formData = new FormData()
      formData.append("picture", selectedImage)

      const response = await fetch("http://127.0.0.1:8000/profile-picture/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        if (data.status === "success") {
          // Update the profile picture in the state
          setUserData((prev) => (prev ? { ...prev, profile_picture: data.picture_url } : null))
          setSelectedImage(null)
          setImagePreview(null)
        } else {
          console.error("Failed to upload profile picture")
        }
      } else {
        console.error("Failed to upload profile picture")
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error)
    }
  }

  const handleEditToggle = (): void => {
    if (isEditing) {
      handleSaveProfile()
    } else {
      setIsEditing(true)
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setUserData((prevData) => (prevData ? { ...prevData, [name]: value } : null))
  }

  const handleArrayChange = (e: ChangeEvent<HTMLInputElement>, field: "links" | "banners") => {
    const { value } = e.target
    setUserData((prevData) => (prevData ? { ...prevData, [field]: value.split(", ") } : null))
  }

  const handleDeleteAccount = async (): Promise<void> => {
    setDeleteLoading(true)
    setDeleteError(null)

    try {
      const token = localStorage.getItem("access_token")

      if (!token) {
        router.push("/login")
        return
      }

      // Replace with your actual delete account endpoint
      const response = await fetch("http://127.0.0.1:8000/delete_account/", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        // Clear local storage
        localStorage.removeItem("access_token")
        // Redirect to login page
        router.push("/login")
      } else {
        const errorData = await response.json()
        setDeleteError(errorData.message || "Failed to delete account. Please try again.")
      }
    } catch (error) {
      console.error("Error deleting account:", error)
      setDeleteError("An unexpected error occurred. Please try again.")
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center items-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  // Define the border style for edit mode
  const editBorderStyle = isEditing ? "border-blue-500" : "border-gray-700"

  return (
    <div className="min-h-screen bg-[#151b27] text-white flex flex-col items-center justify-center">
      <Navbar />
      <div className="flex w-full">
        <Sidebar />
        <div className="w-full max-w-3xl mx-auto p-4">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            {/* Header with back button */}
            <div className="flex items-center mb-4">
              <h1 className="text-xl font-semibold ml-4">{isEditing ? "Edit profile" : "Your information"}</h1>
              <button onClick={handleEditToggle} className="ml-auto bg-blue-500 text-white px-4 py-2 rounded">
                {isEditing ? "Save" : "Edit"}
              </button>
            </div>

            <div className={`border-b ${editBorderStyle} pb-8 transition-colors duration-200`}>
              {/* Profile pictures section */}
              <div className="flex flex-col items-center mb-4">
                <div className="relative mb-4">
                  {imagePreview ? (
                    // Show preview of the selected image
                    <div className="w-24 h-24 rounded-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : userData?.profile_picture ? (
                    // Show current profile picture using img tag instead of Image component
                    <div className="w-24 h-24 rounded-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={userData.profile_picture || "/placeholder.svg"}
                        alt="Profile picture"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      id="profile-picture"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label htmlFor="profile-picture" className="text-blue-400 text-lg cursor-pointer">
                      Select new picture
                    </label>
                    {selectedImage && (
                      <button onClick={handleUploadProfilePicture} className="bg-blue-500 text-white px-4 py-2 rounded">
                        Upload Picture
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* User info section */}
              <div className="space-y-6">
                <div
                  className={`flex justify-between items-center border-b ${editBorderStyle} pb-4 transition-colors duration-200`}
                >
                  <span className="text-lg flex-1">Email</span>
                  <span className="text-gray-300 flex-1 text-right">{userData?.email || "No email"}</span>
                </div>

                <div
                  className={`flex justify-between items-center border-b ${editBorderStyle} pb-4 transition-colors duration-200`}
                >
                  <span className="text-lg flex-1">Username</span>
                  <span className="text-gray-300 flex-1 text-right">{userData?.username || "No username"}</span>
                </div>

                <div
                  className={`flex justify-between items-center border-b ${editBorderStyle} pb-4 transition-colors duration-200`}
                >
                  <span className="text-lg flex-1">Name</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={userData?.name || ""}
                      onChange={handleInputChange}
                      className="bg-gray-800 text-white rounded p-2 ml-2 flex-1 border border-blue-500"
                    />
                  ) : (
                    <span className="text-gray-300 flex-1 text-right">{userData?.name || "Add name"}</span>
                  )}
                </div>

                <div
                  className={`flex justify-between items-center border-b ${editBorderStyle} pb-4 transition-colors duration-200`}
                >
                  <span className="text-lg flex-1">Pronouns</span>
                  {isEditing ? (
                    <select
                      name="pronoun"
                      value={userData?.pronoun || ""}
                      onChange={handleInputChange}
                      className="bg-gray-800 text-white rounded p-2 ml-2 flex-1 border border-blue-500"
                    >
                      {pronounOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-300 flex-1 text-right">{userData?.pronoun || "Add pronouns"}</span>
                  )}
                </div>

                <div
                  className={`flex justify-between items-center border-b ${editBorderStyle} pb-4 transition-colors duration-200`}
                >
                  <span className="text-lg flex-1">Gender</span>
                  {isEditing ? (
                    <select
                      name="gender"
                      value={userData?.gender || ""}
                      onChange={handleInputChange}
                      className="bg-gray-800 text-white rounded p-2 ml-2 flex-1 border border-blue-500"
                    >
                      {genderOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-300 flex-1 text-right">{userData?.gender || "Not specified"}</span>
                  )}
                </div>

                <div
                  className={`flex justify-between items-center border-b ${editBorderStyle} pb-4 transition-colors duration-200`}
                >
                  <span className="text-lg flex-1">Bio</span>
                  {isEditing ? (
                    <textarea
                      name="bio"
                      value={userData?.bio || ""}
                      onChange={handleInputChange}
                      className="bg-gray-800 text-white rounded p-2 ml-2 flex-1 border border-blue-500"
                    />
                  ) : (
                    <span className="text-gray-300 flex-1 text-right">{userData?.bio || "Add bio"}</span>
                  )}
                </div>

                <div className={`flex justify-between items-center pb-4 transition-colors duration-200`}>
                  <span className="text-lg flex-1">Joined Date</span>
                  <span className="text-gray-300 flex-1 text-right">{userData?.joined_date || "Unknown"}</span>
                </div>
              </div>
            </div>

            {/* Additional options */}
            <div className="mt-6 space-y-6">
              <button
                onClick={() => setShowDeleteConfirmation(true)}
                className="text-red-500 text-lg block w-full text-left hover:text-red-400 transition-colors"
              >
                Delete account
              </button>
            </div>

            {/* Delete Account Confirmation Modal */}
            {showDeleteConfirmation && (
              <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                  <h2 className="text-xl font-bold mb-4">Delete Account</h2>
                  <p className="mb-6">
                    Are you sure you want to delete your account? This action cannot be undone and all your data will be
                    permanently removed.
                  </p>

                  {deleteError && <div className="bg-red-900 text-white p-3 rounded mb-4">{deleteError}</div>}

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirmation(false)}
                      className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                      disabled={deleteLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition-colors flex items-center"
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        "Delete Account"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage

