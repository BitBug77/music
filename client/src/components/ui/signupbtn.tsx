'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

const Signupbtn = () => {
  const router = useRouter();
  const handleSignup = () => {
    router.push('/signup');
  };

  return (
    <button onClick={handleSignup} className="hover:bg-black hover:bg-opacity-30 text-yellow-100 px-4 py-1 border-2 border-yellow-100  rounded-full text-sm transition">
      Sign Up
    </button>
    
  );
}
export default Signupbtn;