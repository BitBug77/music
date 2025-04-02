"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { MessageSquare, ThumbsUp, Star, Send, Music, Users, Headphones } from "lucide-react"
import Sidebar from "../../components/ui/sidebar"
import Navbar from "../../components/ui/navbar"

export default function FeedbackPage() {
  const [feedbackType, setFeedbackType] = useState("music")
  const [rating, setRating] = useState<number | null>(null)
  const [feedbackText, setFeedbackText] = useState("")
  const [contactConsent, setContactConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would normally send the feedback to your backend
    console.log({
      feedbackType,
      rating,
      feedbackText,
      contactConsent,
    })

    // Show success message
    setSubmitted(true)

    // Reset form after 3 seconds
    setTimeout(() => {
      setFeedbackType("music")
      setRating(null)
      setFeedbackText("")
      setContactConsent(false)
      setSubmitted(false)
    }, 3000)
  }

  return (
    <div className="flex h-screen bg-[#151b27]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-4xl mx-auto py-8 px-4 text-white">
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#3b82f6]">Give Feedback</h1>
                <p className="text-gray-400">
                  We value your input to help us improve our music recommendation platform.
                </p>
              </div>

              {submitted ? (
                <Card className="bg-[#1e3a29] border-[#2a5a3f]">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center space-y-3 text-center">
                      <div className="rounded-full bg-[#2a5a3f] p-3">
                        <ThumbsUp className="h-6 w-6 text-green-400" />
                      </div>
                      <h3 className="text-xl font-medium text-green-300">Thank You for Your Feedback!</h3>
                      <p className="text-green-400">
                        Your feedback has been submitted successfully. We appreciate your input and will use it to
                        improve our music recommendation platform.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-[#1e2738] border-[#2a3649]">
                  <CardHeader>
                    <CardTitle className="flex items-center text-[#3b82f6]">
                      <MessageSquare className="mr-2 h-5 w-5" />
                      Share Your Thoughts
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Your feedback helps us improve our music platform and provide a better experience.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label className="font-medium">What type of feedback do you have?</Label>
                        <RadioGroup value={feedbackType} onValueChange={setFeedbackType} className="grid gap-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="music" id="music" />
                            <Label htmlFor="music" className="flex items-center">
                              <Music className="mr-2 h-4 w-4" />
                              Music Recommendations
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="social" id="social" />
                            <Label htmlFor="social" className="flex items-center">
                              <Users className="mr-2 h-4 w-4" />
                              Social Connections
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="feature" id="feature" />
                            <Label htmlFor="feature" className="flex items-center">
                              <Headphones className="mr-2 h-4 w-4" />
                              Feature Request
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="bug" id="bug" />
                            <Label htmlFor="bug">Technical Issue</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-medium">How would you rate your experience?</Label>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setRating(value)}
                              className={`rounded-md p-2 transition-colors ${rating === value ? "text-yellow-500" : "text-gray-500 hover:text-yellow-400"}`}
                            >
                              <Star className="h-6 w-6 fill-current" />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="feedback" className="font-medium">
                          Your Feedback
                        </Label>
                        <Textarea
                          id="feedback"
                          placeholder={
                            feedbackType === "music"
                              ? "Tell us about your music recommendation experience..."
                              : feedbackType === "social"
                                ? "Share your thoughts on connecting with other music lovers..."
                                : feedbackType === "feature"
                                  ? "Describe the feature you'd like to see..."
                                  : "Please describe the issue you're experiencing..."
                          }
                          rows={5}
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          required
                          className="bg-[#151b27] border-[#2a3649]"
                        />
                      </div>

                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="contact-consent"
                          checked={contactConsent}
                          onCheckedChange={(checked) => setContactConsent(checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label htmlFor="contact-consent" className="text-sm font-medium">
                            Contact permission
                          </Label>
                          <p className="text-xs text-gray-400">
                            You can contact me about this feedback for additional information.
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <p className="text-xs text-gray-400">
                          Your feedback is anonymous unless you choose to be contacted.
                        </p>
                        <Button type="submit" className="flex items-center bg-[#3b82f6] hover:bg-blue-700">
                          <Send className="mr-2 h-4 w-4" />
                          Submit Feedback
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

