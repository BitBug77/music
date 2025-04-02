"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HelpCircle, MessageSquare, LifeBuoy, Search, ArrowRight, Music, Users } from "lucide-react"
import Sidebar from "../../components/ui/sidebar"
import Navbar from "../../components/ui/navbar"

export default function HelpSupportPage() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="flex h-screen bg-[#151b27]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-6xl mx-auto py-8 px-4 text-white">
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#3b82f6]">Help & Support</h1>
                <p className="text-gray-400">Find answers to common questions or contact our support team.</p>
              </div>

              

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                
              </div>

              <Tabs defaultValue="faq" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-[#1e2738]">
                  <TabsTrigger value="faq">Frequently Asked Questions</TabsTrigger>
                  <TabsTrigger value="contact">Contact Us</TabsTrigger>
                </TabsList>

                <TabsContent value="faq" className="mt-6">
                  <Card className="bg-[#1e2738] border-[#2a3649]">
                    <CardHeader>
                      <CardTitle className="flex items-center text-[#3b82f6]">
                        <HelpCircle className="mr-2 h-5 w-5" />
                        Frequently Asked Questions
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Find answers to the most common questions about our music platform.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1" className="border-[#2a3649]">
                          <AccordionTrigger className="text-white">
                            How does the music recommendation system work?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-400">
                            <p className="text-sm">
                              Our recommendation system analyzes your listening history, liked songs, and followed
                              artists to suggest music you might enjoy. We also consider the listening habits of users
                              with similar taste to yours. The more you use the platform, the more personalized your
                              recommendations will become.
                            </p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-2" className="border-[#2a3649]">
                          <AccordionTrigger className="text-white">
                            How do I connect with people who have similar music taste?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-400">
                            <p className="text-sm">
                              Our platform automatically suggests potential friends based on music compatibility. You
                              can view these suggestions in the "Connect" tab. You can also search for users and see a
                              compatibility score based on your shared music interests. Send a friend request to start
                              connecting!
                            </p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3" className="border-[#2a3649]">
                          <AccordionTrigger className="text-white">
                            How do I create and share playlists?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-400">
                            <p className="text-sm">
                              To create a playlist, go to "Your Library" and click "Create Playlist." Give your playlist
                              a name and description, then start adding songs by searching for them or browsing your
                              favorite artists. To share a playlist, open it and click the "Share" button. You can share
                              via a link, social media, or directly with friends on the platform.
                            </p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-4" className="border-[#2a3649]">
                          <AccordionTrigger className="text-white">
                            How accurate are the music compatibility scores?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-400">
                            <p className="text-sm">
                              Our compatibility scores are calculated using a sophisticated algorithm that considers
                              shared artists, genres, listening patterns, and music preferences. The scores range from
                              0-100%, with higher percentages indicating stronger musical compatibility. These scores
                              are continuously refined as you listen to more music and interact with the platform.
                            </p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-5" className="border-[#2a3649]">
                          <AccordionTrigger className="text-white">
                            How do I link my streaming services?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-400">
                            <p className="text-sm">
                              To link your streaming services, go to "Settings & Privacy" and select the "Account" tab.
                              Under "Linked Music Services," you'll find options to connect Spotify, Apple Music,
                              YouTube Music, and other services. Click "Connect" next to the service you want to link
                              and follow the authentication steps. Once connected, we'll be able to analyze your
                              listening history for better recommendations.
                            </p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-6" className="border-[#2a3649]">
                          <AccordionTrigger className="text-white">
                            How do I control who sees my music activity?
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-400">
                            <p className="text-sm">
                              You can control your privacy settings by going to "Settings & Privacy" and selecting the
                              "Privacy" tab. There, you can toggle options for sharing your listening activity, top
                              artists, and playlists. You can choose to make your profile completely private, visible
                              only to friends, or public to all users. You can also hide specific listening activity if
                              you prefer.
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="contact" className="mt-6">
                  <Card className="bg-[#1e2738] border-[#2a3649]">
                    <CardHeader>
                      <CardTitle className="flex items-center text-[#3b82f6]">
                        <MessageSquare className="mr-2 h-5 w-5" />
                        Contact Support
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Get in touch with our support team for personalized assistance.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">
                              Name
                            </label>
                            <Input id="name" placeholder="Your name" className="bg-[#151b27] border-[#2a3649]" />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                              Email
                            </label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="Your email address"
                              className="bg-[#151b27] border-[#2a3649]"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="subject" className="text-sm font-medium">
                            Subject
                          </label>
                          <select
                            id="subject"
                            className="w-full h-10 px-3 py-2 bg-[#151b27] border border-[#2a3649] rounded-md text-sm"
                          >
                            <option value="">Select a topic</option>
                            <option value="recommendation">Music Recommendations</option>
                            <option value="social">Social Connections</option>
                            <option value="account">Account Issues</option>
                            <option value="technical">Technical Problems</option>
                            <option value="billing">Billing & Subscription</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="message" className="text-sm font-medium">
                            Message
                          </label>
                          <Textarea
                            id="message"
                            placeholder="Please describe your issue in detail..."
                            rows={5}
                            className="bg-[#151b27] border-[#2a3649]"
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="attachment" className="text-sm font-medium">
                            Attachment (optional)
                          </label>
                          <Input id="attachment" type="file" className="bg-[#151b27] border-[#2a3649]" />
                          <p className="text-xs text-gray-400">
                            Max file size: 10MB. Supported formats: JPG, PNG, PDF, MP3.
                          </p>
                        </div>
                      </form>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <p className="text-xs text-gray-400">We typically respond within 24 hours.</p>
                      <Button className="bg-[#3b82f6] hover:bg-blue-700">Submit Request</Button>
                    </CardFooter>
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

