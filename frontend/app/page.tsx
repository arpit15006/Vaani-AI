import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { DemoPreview } from "@/components/landing/demo-preview"
import { Footer } from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Features />
      <DemoPreview />
      <Footer />
    </main>
  )
}
