import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col h-screen">
      {/* Placeholder for Navbar */}
      <div className="h-16 bg-[#74686e]"></div>

      <div className="flex flex-1">
        {/* Placeholder for Sidebar */}
        <div className="hidden md:block w-64 bg-[#151b27]/80"></div>

        {/* Main content loading state */}
        <div className="flex-1 bg-[#151b27] p-8">
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-12 w-12 text-pink-500 animate-spin mb-4" />
            <p className="text-white/70 text-lg">Loading people...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

