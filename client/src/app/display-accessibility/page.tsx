"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Moon, Sun, Monitor, Palette, Type, Eye, Music, Volume2 } from "lucide-react"
import Sidebar from "../../components/ui/sidebar"
import Navbar from "../../components/ui/navbar"

export default function DisplayAccessibilityPage() {
  const [theme, setTheme] = useState("dark")
  const [fontSize, setFontSize] = useState(16)
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [colorBlindMode, setColorBlindMode] = useState("none")
  const [autoplayMusic, setAutoplayMusic] = useState(true)
  const [showVisualizers, setShowVisualizers] = useState(true)
  const [musicVolume, setMusicVolume] = useState(80)

  // Simulate theme change
  useEffect(() => {
    document.documentElement.classList.remove("light-theme", "dark-theme")

    if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark-theme")
    } else {
      document.documentElement.classList.add("light-theme")
    }
  }, [theme])

  // Simulate font size change
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`
  }, [fontSize])

  return (
    <div className="flex h-screen bg-[#151b27]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-6xl mx-auto py-8 px-4 text-white">
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#3b82f6]">Display & Accessibility</h1>
                <p className="text-gray-400">
                  Customize your music experience with display preferences and accessibility options.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-[#1e2738] border-[#2a3649]">
                  <CardHeader>
                    <CardTitle className="flex items-center text-[#3b82f6]">
                      <Palette className="mr-2 h-5 w-5" />
                      Theme & Display
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Customize the appearance of the music platform.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-medium">Theme</h3>
                      <RadioGroup value={theme} onValueChange={setTheme} className="flex space-x-2">
                        <div className="flex flex-col items-center space-y-1">
                          <RadioGroupItem value="light" id="light" className="sr-only" />
                          <Label
                            htmlFor="light"
                            className={`cursor-pointer rounded-md border-2 p-2 ${theme === "light" ? "border-[#3b82f6]" : "border-[#2a3649]"} bg-[#151b27]`}
                          >
                            <Sun className="h-5 w-5" />
                          </Label>
                          <span className="text-xs text-gray-400">Light</span>
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                          <RadioGroupItem value="dark" id="dark" className="sr-only" />
                          <Label
                            htmlFor="dark"
                            className={`cursor-pointer rounded-md border-2 p-2 ${theme === "dark" ? "border-[#3b82f6]" : "border-[#2a3649]"} bg-[#151b27]`}
                          >
                            <Moon className="h-5 w-5" />
                          </Label>
                          <span className="text-xs text-gray-400">Dark</span>
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                          <RadioGroupItem value="system" id="system" className="sr-only" />
                          <Label
                            htmlFor="system"
                            className={`cursor-pointer rounded-md border-2 p-2 ${theme === "system" ? "border-[#3b82f6]" : "border-[#2a3649]"} bg-[#151b27]`}
                          >
                            <Monitor className="h-5 w-5" />
                          </Label>
                          <span className="text-xs text-gray-400">System</span>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator className="bg-[#2a3649]" />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="high-contrast" className="font-medium">
                          High Contrast
                        </Label>
                        <Switch id="high-contrast" checked={highContrast} onCheckedChange={setHighContrast} />
                      </div>
                      <p className="text-xs text-gray-400">Increase contrast between elements for better visibility.</p>
                    </div>

                    <Separator className="bg-[#2a3649]" />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="autoplay-music" className="font-medium">
                          Autoplay Music
                        </Label>
                        <Switch id="autoplay-music" checked={autoplayMusic} onCheckedChange={setAutoplayMusic} />
                      </div>
                      <p className="text-xs text-gray-400">
                        Automatically play music when viewing artist or album pages.
                      </p>
                    </div>

                    <Separator className="bg-[#2a3649]" />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-visualizers" className="font-medium">
                          Music Visualizers
                        </Label>
                        <Switch id="show-visualizers" checked={showVisualizers} onCheckedChange={setShowVisualizers} />
                      </div>
                      <p className="text-xs text-gray-400">Show animated visualizers when playing music.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1e2738] border-[#2a3649]">
                  <CardHeader>
                    <CardTitle className="flex items-center text-[#3b82f6]">
                      <Eye className="mr-2 h-5 w-5" />
                      Accessibility
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Adjust settings to make the music platform more accessible.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Type className="h-5 w-5" />
                          <Label htmlFor="font-size" className="font-medium">
                            Font Size
                          </Label>
                        </div>
                        <span className="text-sm">{fontSize}px</span>
                      </div>
                      <Slider
                        id="font-size"
                        min={12}
                        max={24}
                        step={1}
                        value={[fontSize]}
                        onValueChange={(value) => setFontSize(value[0])}
                        className="py-2"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Small</span>
                        <span>Medium</span>
                        <span>Large</span>
                      </div>
                    </div>

                    <Separator className="bg-[#2a3649]" />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="reduced-motion" className="font-medium">
                          Reduced Motion
                        </Label>
                        <Switch id="reduced-motion" checked={reducedMotion} onCheckedChange={setReducedMotion} />
                      </div>
                      <p className="text-xs text-gray-400">Minimize animations and motion effects.</p>
                    </div>

                    <Separator className="bg-[#2a3649]" />

                    <div className="space-y-2">
                      <Label htmlFor="color-blind-mode" className="font-medium">
                        Color Blind Mode
                      </Label>
                      <Select value={colorBlindMode} onValueChange={setColorBlindMode}>
                        <SelectTrigger id="color-blind-mode" className="bg-[#151b27] border-[#2a3649]">
                          <SelectValue placeholder="Select a color blind mode" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e2738] border-[#2a3649]">
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="protanopia">Protanopia (Red-Blind)</SelectItem>
                          <SelectItem value="deuteranopia">Deuteranopia (Green-Blind)</SelectItem>
                          <SelectItem value="tritanopia">Tritanopia (Blue-Blind)</SelectItem>
                          <SelectItem value="achromatopsia">Achromatopsia (No Color)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-400">
                        Adjust colors to accommodate different types of color blindness.
                      </p>
                    </div>

                    <Separator className="bg-[#2a3649]" />

                    <div className="space-y-2">
                      <Label htmlFor="screen-reader" className="font-medium">
                        Screen Reader Optimization
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Switch id="screen-reader" defaultChecked />
                        <Label htmlFor="screen-reader" className="text-gray-400">
                          Enabled
                        </Label>
                      </div>
                      <p className="text-xs text-gray-400">
                        Optimize the interface for screen readers and assistive technologies.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-[#1e2738] border-[#2a3649]">
                <CardHeader>
                  <CardTitle className="flex items-center text-[#3b82f6]">
                    <Music className="mr-2 h-5 w-5" />
                    Music Playback Settings
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Control how music is played and displayed throughout the platform.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Volume2 className="h-5 w-5" />
                        <Label htmlFor="music-volume" className="font-medium">
                          Default Volume
                        </Label>
                      </div>
                      <span className="text-sm">{musicVolume}%</span>
                    </div>
                    <Slider
                      id="music-volume"
                      min={0}
                      max={100}
                      step={5}
                      value={[musicVolume]}
                      onValueChange={(value) => setMusicVolume(value[0])}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Quiet</span>
                      <span>Medium</span>
                      <span>Loud</span>
                    </div>
                  </div>

                  <Separator className="bg-[#2a3649]" />

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="default-view" className="font-medium">
                        Default Music View
                      </Label>
                      <Select defaultValue="grid">
                        <SelectTrigger id="default-view" className="bg-[#151b27] border-[#2a3649]">
                          <SelectValue placeholder="Select a default view" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e2738] border-[#2a3649]">
                          <SelectItem value="grid">Album Grid</SelectItem>
                          <SelectItem value="list">Track List</SelectItem>
                          <SelectItem value="compact">Compact View</SelectItem>
                          <SelectItem value="artwork">Artwork Focus</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-400">Choose how music is displayed by default.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="audio-quality" className="font-medium">
                        Audio Quality
                      </Label>
                      <Select defaultValue="high">
                        <SelectTrigger id="audio-quality" className="bg-[#151b27] border-[#2a3649]">
                          <SelectValue placeholder="Select audio quality" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e2738] border-[#2a3649]">
                          <SelectItem value="low">Low (Save Data)</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="lossless">Lossless</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-400">
                        Set the quality of music playback. Higher quality uses more data.
                      </p>
                    </div>
                  </div>

                  <Separator className="bg-[#2a3649]" />

                  <div className="space-y-2">
                    <Label className="font-medium">Playback Options</Label>
                    <div className="grid gap-2 mt-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-400">Crossfade between songs</p>
                        <Switch defaultChecked id="crossfade" />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-400">Normalize volume</p>
                        <Switch defaultChecked id="normalize" />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-400">Show lyrics during playback</p>
                        <Switch defaultChecked id="lyrics" />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-400">Enable audio equalizer</p>
                        <Switch id="equalizer" />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-[#3b82f6] hover:bg-blue-700">Save Playback Settings</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

