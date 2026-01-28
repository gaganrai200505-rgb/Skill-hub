import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="app-bg min-h-[calc(100vh-64px)]">
      <section className="hero-grad text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-24 text-center">
          <motion.h1
            className="text-5xl sm:text-6xl font-black tracking-tight"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          >
            Learn Skills from <span className="text-yellow-300">Fellow Students</span>
          </motion.h1>
          <p className="mt-6 text-lg opacity-90">
            Join a community where students teach and learn from each other.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              to="/skills"
              className="rounded-full bg-white/95 text-gray-900 px-6 py-3 font-medium hover:bg-white"
            >
              Browse Skills →
            </Link>
            <Link
              to="/signup"
              className="rounded-full border border-white/70 px-6 py-3 font-medium hover:bg-white/10"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Learn from Peers", desc: "Connect with students who excel in skills you want to learn."},
          { title: "Teach What You Know", desc: "Share expertise and help others while building your portfolio."},
          { title: "Flexible Scheduling", desc: "Book sessions that fit your schedule with our calendar."},
          { title: "Real-time Chat", desc: "Stay connected through instant messaging."},
        ].map((c, i) => (
          <div key={i} className="rounded-2xl bg-white p-6 shadow-card border">
            <div className="text-xl font-semibold">{c.title}</div>
            <p className="text-gray-600 mt-2">{c.desc}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-24">
        <div className="rounded-3xl hero-grad text-white p-10 text-center shadow-card">
          <h2 className="text-3xl font-bold">Ready to Start Your Learning Journey?</h2>
          <p className="opacity-90 mt-2">Create your profile today and discover new skills!</p>
          <div className="mt-6">
            <Link to="/signup" className="bg-white text-gray-900 rounded-full px-6 py-3 font-medium">
              Create Free Account →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
