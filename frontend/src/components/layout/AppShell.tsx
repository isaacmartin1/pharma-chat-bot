'use client'

import type { Session, User, ComplianceResult } from '@/lib/types'
import { Sidebar } from './Sidebar'
import { ChatPanel } from '../chat/ChatPanel'
import { PreviewPanel } from '../preview/PreviewPanel'
import { AssetModal } from '../preview/AssetModal'

interface Props {
  sessions: Session[]
  currentSessionId: string | null
  currentSession: Session | null
  user: User | null
  assetHtml: string | null
  assetId: string | null
  complianceResult: ComplianceResult | null
  onNewChat: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onLogout: () => void
  onAssetCreated: (html: string, id: string) => void
  onAssetChange: (html: string) => void
  onComplianceResult: (result: ComplianceResult) => void
  onGetOrCreateSession: () => Promise<string>
  onSessionTitleUpdated?: (id: string, title: string) => void
  isAssetModalOpen: boolean
  onCloseAssetModal: () => void
  onOpenAssetModal: () => void
  contentType?: string
  defaultDrug?: string
}

export function AppShell({
  sessions,
  currentSessionId,
  currentSession,
  user,
  assetHtml,
  assetId,
  complianceResult,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onLogout,
  onAssetCreated,
  onAssetChange,
  onComplianceResult,
  onGetOrCreateSession,
  onSessionTitleUpdated,
  isAssetModalOpen,
  onCloseAssetModal,
  onOpenAssetModal,
  contentType,
  defaultDrug,
}: Props) {
  return (
    <>
      {isAssetModalOpen && assetHtml && (
        <AssetModal assetHtml={assetHtml} onClose={onCloseAssetModal} />
      )}
      <div
        className="grid h-screen overflow-hidden grid-rows-1"
        style={{ gridTemplateColumns: '260px 1fr 480px' }}
      >
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          user={user}
          onNewChat={onNewChat}
          onSelectSession={onSelectSession}
          onDeleteSession={onDeleteSession}
          onLogout={onLogout}
        />
        <ChatPanel
          sessionId={currentSessionId}
          session={currentSession}
          onAssetCreated={onAssetCreated}
          onComplianceResult={onComplianceResult}
          onGetOrCreateSession={onGetOrCreateSession}
          onSessionTitleUpdated={onSessionTitleUpdated}
          contentType={contentType}
          defaultDrug={defaultDrug}
        />
        <PreviewPanel
          assetHtml={assetHtml}
          assetId={assetId}
          onAssetChange={onAssetChange}
          complianceResult={complianceResult}
          onExpand={onOpenAssetModal}
        />
      </div>
    </>
  )
}
