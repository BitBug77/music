"use client"

import { Slider } from "@/components/ui/slider"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Bell, Eye, Headphones, Radio } from "lucide-react"
import Sidebar from "../../components/ui/sidebar"
import Navbar from "../../components/ui/navbar"

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [newMusicAlerts, setNewMusicAlerts] = useState(true)
  const [friendActivityDigest, setFriendActivityDigest] = useState(true)
  const [twoFactorAuth, setTwoFactorAuth] = useState(false)
  const [loginAlerts, setLoginAlerts] = useState(true)
  const [publicProfile, setPublicProfile] = useState(true)
  const [showListeningActivity, setShowListeningActivity] = useState(true)
  const [shareTopArtists, setShareTopArtists] = useState(true)
  const [allowFriendRequests, setAllowFriendRequests] = useState(true)

  return (
    <div className="flex h-screen bg-[#151b27]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-6xl mx-auto py-8 px-4 text-white">
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#3b82f6]">Settings & Privacy</h1>
                <p className="text-gray-400">
                  Manage your account settings, privacy preferences, and music sharing options.
                </p>
              </div>

              <Tabs defaultValue="privacy" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-[#1e2738]">
                  <TabsTrigger value="privacy">Privacy</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="music">Music</TabsTrigger>
                </TabsList>

                <TabsContent value="privacy" className="space-y-4 mt-6">
                  <Card className="bg-[#1e2738] border-[#2a3649]">
                    <CardHeader>
                      <CardTitle className="flex items-center text-[#3b82f6]">
                        <Eye className="mr-2 h-5 w-5" />
                        Privacy Settings
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Control who can see your profile and music activity.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="public-profile" className="font-medium">
                            Public Profile
                          </Label>
                          <p className="text-sm text-gray-400">Allow others to find and view your profile</p>
                        </div>
                        <Switch id="public-profile" checked={publicProfile} onCheckedChange={setPublicProfile} />
                      </div>
                      <Separator className="bg-[#2a3649]" />
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="listening-activity" className="font-medium">
                            Listening Activity
                          </Label>
                          <p className="text-sm text-gray-400">Share what you're listening to with followers</p>
                        </div>
                        <Switch
                          id="listening-activity"
                          checked={showListeningActivity}
                          onCheckedChange={setShowListeningActivity}
                        />
                      </div>
                      <Separator className="bg-[#2a3649]" />
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="share-top-artists" className="font-medium">
                            Share Top Artists & Tracks
                          </Label>
                          <p className="text-sm text-gray-400">Allow others to see your most played music</p>
                        </div>
                        <Switch id="share-top-artists" checked={shareTopArtists} onCheckedChange={setShareTopArtists} />
                      </div>
                      <Separator className="bg-[#2a3649]" />
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="friend-requests" className="font-medium">
                            Friend Requests
                          </Label>
                          <p className="text-sm text-gray-400">
                            Allow users with similar music taste to send friend requests
                          </p>
                        </div>
                        <Switch
                          id="friend-requests"
                          checked={allowFriendRequests}
                          onCheckedChange={setAllowFriendRequests}
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full bg-[#3b82f6] hover:bg-blue-700">Save Privacy Settings</Button>
                    </CardFooter>
                  </Card>

                  <Card className="bg-[#1e2738] border-[#2a3649]">
                    <CardHeader>
                      <CardTitle className="text-[#3b82f6]">Data Management</CardTitle>
                      <CardDescription className="text-gray-400">
                        Control your data and download or delete your information.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-md border border-[#2a3649] p-4 bg-[#151b27]">
                        <div className="flex flex-col space-y-2">
                          <h4 className="font-medium">Download Your Music Data</h4>
                          <p className="text-sm text-gray-400">
                            Get a copy of your data, including your profile information, playlists, and listening
                            history.
                          </p>
                          <Button
                            variant="outline"
                            className="mt-2 w-full sm:w-auto border-[#2a3649] text-gray-300 hover:bg-[#2a3649]"
                          >
                            Request Download
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-md border border-red-900 p-4 bg-[#151b27]">
                        <div className="flex flex-col space-y-2">
                          <h4 className="font-medium text-red-400">Delete Account</h4>
                          <p className="text-sm text-gray-400">
                            Permanently delete your account and all associated data. This action cannot be undone.
                          </p>
                          <Button variant="destructive" className="mt-2 w-full sm:w-auto">
                            Delete Account
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-4 mt-6">
                  <Card className="bg-[#1e2738] border-[#2a3649]">
                    <CardHeader>
                      <CardTitle className="flex items-center text-[#3b82f6]">
                        <Bell className="mr-2 h-5 w-5" />
                        Notification Preferences
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Choose how and when you want to be notified about music and friends.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email-notifications" className="font-medium">
                            Email Notifications
                          </Label>
                          <p className="text-sm text-gray-400">Receive notifications via email</p>
                        </div>
                        <Switch
                          id="email-notifications"
                          checked={emailNotifications}
                          onCheckedChange={setEmailNotifications}
                        />
                      </div>
                      <Separator className="bg-[#2a3649]" />
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="push-notifications" className="font-medium">
                            Push Notifications
                          </Label>
                          <p className="text-sm text-gray-400">Receive notifications on your device</p>
                        </div>
                        <Switch
                          id="push-notifications"
                          checked={pushNotifications}
                          onCheckedChange={setPushNotifications}
                        />
                      </div>
                      <Separator className="bg-[#2a3649]" />
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="new-music-alerts" className="font-medium">
                            New Music Alerts
                          </Label>
                          <p className="text-sm text-gray-400">
                            Get notified when your favorite artists release new music
                          </p>
                        </div>
                        <Switch id="new-music-alerts" checked={newMusicAlerts} onCheckedChange={setNewMusicAlerts} />
                      </div>
                      <Separator className="bg-[#2a3649]" />
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="friend-activity" className="font-medium">
                            Friend Activity Digest
                          </Label>
                          <p className="text-sm text-gray-400">Get a summary of what your friends are listening to</p>
                        </div>
                        <Switch
                          id="friend-activity"
                          checked={friendActivityDigest}
                          onCheckedChange={setFriendActivityDigest}
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full bg-[#3b82f6] hover:bg-blue-700">Save Notification Settings</Button>
                    </CardFooter>
                  </Card>
                </TabsContent>

                <TabsContent value="music" className="space-y-4 mt-6">
                  <Card className="bg-[#1e2738] border-[#2a3649]">
                    <CardHeader>
                      <CardTitle className="flex items-center text-[#3b82f6]">
                        <Headphones className="mr-2 h-5 w-5" />
                        Music Preferences
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Customize your music experience and recommendation settings.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="favorite-genres" className="font-medium">
                          Favorite Genres
                        </Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {[
                            "Rock",
                            "Pop",
                            "Hip-Hop",
                            "Electronic",
                            "Jazz",
                            "Classical",
                            "R&B",
                            "Country",
                            "Metal",
                            "Indie",
                          ].map((genre) => (
                            <div
                              key={genre}
                              className="bg-[#151b27] border border-[#2a3649] rounded-full px-3 py-1 text-sm"
                            >
                              {genre}
                            </div>
                          ))}
                          <div className="bg-[#3b82f6] rounded-full px-3 py-1 text-sm cursor-pointer">+ Add</div>
                        </div>
                      </div>

                      <Separator className="bg-[#2a3649]" />

                      <div className="space-y-2">
                        <Label className="font-medium">Discovery Settings</Label>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm text-gray-400">Include new releases in recommendations</p>
                          <Switch defaultChecked id="new-releases" />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm text-gray-400">Discover artists similar to my favorites</p>
                          <Switch defaultChecked id="similar-artists" />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm text-gray-400">Recommend based on friends' listening</p>
                          <Switch defaultChecked id="friend-recommendations" />
                        </div>
                      </div>

                      <Separator className="bg-[#2a3649]" />

                      <div className="space-y-2">
                        <Label className="font-medium">Audio Quality</Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <Button variant="outline" className="border-[#2a3649] text-gray-300">
                            Normal
                          </Button>
                          <Button variant="outline" className="border-[#2a3649] bg-[#3b82f6] text-white">
                            High
                          </Button>
                          <Button variant="outline" className="border-[#2a3649] text-gray-300">
                            Ultra
                          </Button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Higher quality uses more data when streaming.</p>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full bg-[#3b82f6] hover:bg-blue-700">Save Music Preferences</Button>
                    </CardFooter>
                  </Card>

                  <Card className="bg-[#1e2738] border-[#2a3649]">
                    <CardHeader>
                      <CardTitle className="flex items-center text-[#3b82f6]">
                        <Radio className="mr-2 h-5 w-5" />
                        Recommendation Tuning
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Fine-tune how we recommend music and potential friends.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="font-medium">Music Recommendation Balance</Label>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Familiar</span>
                            <span className="text-sm text-gray-400">Discover</span>
                          </div>
                          <Slider defaultValue={[60]} max={100} step={10} />
                          <p className="text-xs text-gray-400">
                            Adjust the slider to control how much new music appears in your recommendations.
                          </p>
                        </div>
                      </div>

                      <Separator className="bg-[#2a3649]" />

                      <div className="space-y-2">
                        <Label className="font-medium">Friend Matching Criteria</Label>
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-400">Match based on favorite artists</p>
                            <Switch defaultChecked id="match-artists" />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-400">Match based on genres</p>
                            <Switch defaultChecked id="match-genres" />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-400">Match based on listening habits</p>
                            <Switch defaultChecked id="match-habits" />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-400">Match with people nearby</p>
                            <Switch id="match-location" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

