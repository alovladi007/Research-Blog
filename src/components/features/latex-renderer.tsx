'use client'

import React, { useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface LaTeXRendererProps {
  content: string
  inline?: boolean
  className?: string
}

export function LaTeXRenderer({ content, inline = false, className = '' }: LaTeXRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(content, containerRef.current, {
          displayMode: !inline,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false,
          trust: true,
          macros: {
            '\\RR': '\\mathbb{R}',
            '\\NN': '\\mathbb{N}',
            '\\ZZ': '\\mathbb{Z}',
            '\\QQ': '\\mathbb{Q}',
            '\\CC': '\\mathbb{C}',
          },
        })
      } catch (error) {
        console.error('LaTeX rendering error:', error)
        if (containerRef.current) {
          containerRef.current.innerHTML = `<span style="color: red;">LaTeX Error: ${content}</span>`
        }
      }
    }
  }, [content, inline])

  return (
    <div 
      ref={containerRef} 
      className={`${inline ? 'inline' : 'block my-4'} ${className}`}
    />
  )
}

// Component for rendering mixed text with LaTeX
export function MixedContentRenderer({ content }: { content: string }) {
  // Regular expression to match LaTeX expressions
  const latexPattern = /\$\$(.*?)\$\$|\$(.*?)\$/g
  
  const renderContent = () => {
    const parts = []
    let lastIndex = 0
    let match

    while ((match = latexPattern.exec(content)) !== null) {
      // Add text before LaTeX
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, match.index)}
          </span>
        )
      }

      // Add LaTeX content
      const isDisplay = match[0].startsWith('$$')
      const latexContent = match[1] || match[2]
      
      parts.push(
        <LaTeXRenderer
          key={`latex-${match.index}`}
          content={latexContent}
          inline={!isDisplay}
        />
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.substring(lastIndex)}
        </span>
      )
    }

    return parts
  }

  return <div className="prose prose-scholar">{renderContent()}</div>
}