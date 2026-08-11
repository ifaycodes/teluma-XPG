import React from 'react'

interface LogoProps {
  size?: number
  className?: string
}

export default function TelumaLogo({ size = 36, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-gradient-to-br from-[#C21E36] to-[#8F1526] flex items-center justify-center shadow-md flex-shrink-0 ${className}`}
    >
      <svg
        viewBox="0 0 128 128"
        className="w-3/5 h-3/5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 36 34 H 92 C 95 34 97 36 97 39 V 47 C 97 50 95 52 92 52 H 71 V 89 C 71 93 68 96 64 96 H 64 C 60 96 57 93 57 89 V 52 H 36 C 33 52 31 50 31 47 V 39 C 31 36 33 34 36 34 Z"
          fill="#FDFAF4"
        />
      </svg>
    </div>
  )
}
