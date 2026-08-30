"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, User, UserPlus, ArrowLeft } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate sign up
    window.location.href = "/";
  };

  return (
    <div className="bg-white/75 backdrop-blur-md p-6 sm:p-8 border border-white/20 rounded-2xl shadow-2xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
          Create an account
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Get started with your free account today.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Full name
          </label>
          <div className="relative">
            <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1A45] focus:bg-white transition-colors text-gray-900"
              placeholder="Enter your full name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Email address
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1A45] focus:bg-white transition-colors text-gray-900"
              placeholder="Enter your email"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B1A45] focus:bg-white transition-colors text-gray-900"
              placeholder="Create a password"
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Must be at least 8 characters.
          </p>
        </div>

        <button
          type="submit"
          className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl shadow-lg shadow-[#0B1A45]/25 text-sm font-semibold text-white bg-[#0B1A45] hover:bg-[#132B66] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B1A45] transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Create account
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#0B1A45] hover:text-[#162C65] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 inline mr-1" /> Sign in
        </Link>
      </div>
    </div>
  );
}
