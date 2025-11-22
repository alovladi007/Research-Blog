'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  ArrowRight, 
  Award, 
  BookOpen, 
  Brain, 
  CheckCircle2, 
  FileText, 
  Globe, 
  GraduationCap,
  LineChart,
  Lock,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  Users,
  Zap
} from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'Verified Academic Credentials',
    description: 'Rigorous verification through institutional emails ensures authentic academic community',
    color: 'text-blue-600'
  },
  {
    icon: Brain,
    title: 'LaTeX & Citation Support',
    description: 'Native LaTeX rendering and comprehensive citation management for academic writing',
    color: 'text-purple-600'
  },
  {
    icon: Users,
    title: 'Research Collaboration',
    description: 'Form research groups, manage projects, and collaborate with peers worldwide',
    color: 'text-green-600'
  },
  {
    icon: FileText,
    title: 'Paper Sharing & Review',
    description: 'Share preprints, get peer feedback, and track citations in real-time',
    color: 'text-orange-600'
  },
  {
    icon: MessageSquare,
    title: 'Academic Discussions',
    description: 'Engage in scholarly debates with threaded discussions and expert insights',
    color: 'text-red-600'
  },
  {
    icon: LineChart,
    title: 'Research Analytics',
    description: 'Track your research impact with detailed analytics and citation metrics',
    color: 'text-indigo-600'
  }
]

const stats = [
  { value: '50K+', label: 'Verified Researchers' },
  { value: '200+', label: 'Universities' },
  { value: '10K+', label: 'Papers Shared' },
  { value: '1M+', label: 'Academic Discussions' }
]

export default function LandingPage() {
  const [bypassAuth, setBypassAuth] = useState(false)

  useEffect(() => {
    setBypassAuth(process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true')
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-scholar-50 via-white to-scholar-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-effect">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-scholar-600" />
              <span className="text-2xl font-bold gradient-text">ScholarHub</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/features" className="text-gray-700 hover:text-scholar-600 transition">Features</Link>
              <Link href="/about" className="text-gray-700 hover:text-scholar-600 transition">About</Link>
              <Link href="/pricing" className="text-gray-700 hover:text-scholar-600 transition">Pricing</Link>
              <Link href="/contact" className="text-gray-700 hover:text-scholar-600 transition">Contact</Link>
            </div>
            <div className="flex items-center space-x-4">
              {bypassAuth ? (
                <Link href="/dashboard">
                  <Button className="bg-scholar-600 hover:bg-scholar-700">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/signin">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button className="bg-scholar-600 hover:bg-scholar-700">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="inline-flex items-center px-4 py-2 bg-scholar-100 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-scholar-600 mr-2" />
              <span className="text-sm font-medium text-scholar-700">Trusted by researchers at top universities</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text">
              Where Academia Connects
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              The premier platform for researchers, scientists, and students to collaborate, 
              share knowledge, and advance academic discourse.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={bypassAuth ? "/dashboard" : "/auth/signup"}>
                <Button size="lg" className="bg-scholar-600 hover:bg-scholar-700 text-lg px-8">
                  {bypassAuth ? "Go to Dashboard" : "Join the Community"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/explore">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  <Search className="mr-2 h-5 w-5" />
                  Explore Research
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-scholar-700">{stat.value}</div>
                <div className="text-gray-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for <span className="gradient-text">Academic Excellence</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every feature designed with researchers in mind, from rigorous verification to advanced collaboration tools.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100"
              >
                <feature.icon className={`h-12 w-12 ${feature.color} mb-4`} />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Verification Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-scholar-600 to-scholar-800 text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Rigorous Verification Process
              </h2>
              <p className="text-xl mb-8 text-scholar-100">
                Unlike other platforms, we ensure every member is a genuine academic through 
                institutional email verification and credential checks.
              </p>
              <ul className="space-y-4">
                {[
                  'Institutional email verification (.edu, research institutes)',
                  'ORCID integration for researcher identification',
                  'Department and affiliation validation',
                  'Academic role verification (Student, Researcher, Professor)'
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle2 className="h-6 w-6 text-scholar-300 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <Lock className="h-16 w-16 text-scholar-300 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">Trust & Security</h3>
                <p className="text-scholar-100">
                  Your academic reputation is safe with us. We maintain the highest standards 
                  of data security and privacy protection.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Join the <span className="gradient-text">Academic Revolution?</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Connect with researchers worldwide and accelerate your academic journey.
            </p>
            <Link href={bypassAuth ? "/dashboard" : "/auth/signup"}>
              <Button size="lg" className="bg-scholar-600 hover:bg-scholar-700 text-lg px-10 py-6">
                {bypassAuth ? "Go to Dashboard" : "Get Started Free"}
                <Zap className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            {!bypassAuth && (
              <p className="text-sm text-gray-500 mt-4">
                No credit card required • Verify with your institutional email
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <GraduationCap className="h-8 w-8 text-scholar-400" />
                <span className="text-2xl font-bold">ScholarHub</span>
              </div>
              <p className="text-gray-400">
                Empowering academic collaboration worldwide.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white transition">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="/roadmap" className="hover:text-white transition">Roadmap</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/docs" className="hover:text-white transition">Documentation</Link></li>
                <li><Link href="/blog" className="hover:text-white transition">Blog</Link></li>
                <li><Link href="/support" className="hover:text-white transition">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
                <li><Link href="/academic-integrity" className="hover:text-white transition">Academic Integrity</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ScholarHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}