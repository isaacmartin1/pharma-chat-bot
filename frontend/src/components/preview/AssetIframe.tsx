'use client'

interface Props {
  html: string
}

export function AssetIframe({ html }: Props) {
  return (
    <iframe
      srcDoc={html}
      sandbox="allow-same-origin"
      className="w-full h-full border-0"
      title="Asset Preview"
    />
  )
}
