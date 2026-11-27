import React, { useState } from 'react'

function TreeNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  const depthColors = ['#6D5AE6', '#0F8B8D', '#2563EB', '#D9485F', '#E67E22']
  const color = depthColors[depth % depthColors.length]

  return (
    <div className={`mindmap-node depth-${depth}`}>
      <div
        className="mindmap-node-pill"
        style={{
          borderLeftColor: color,
          background: depth === 0 ? '#6D5AE6' : '#FFFFFF',
          color: depth === 0 ? '#FFFFFF' : '#25213B',
        }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <span className="node-text">{node.name}</span>
        {hasChildren && (
          <span className="expand-indicator">
            {expanded ? '−' : `+ ${node.children.length}`}
          </span>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="mindmap-children">
          {node.children.map((child, idx) => (
            <TreeNode key={idx} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MindMapViewer({ mindmapData, onRegenerate, isLoading }) {
  if (isLoading) {
    return (
      <div className="mindmap-loading-box">
        <div className="pulse-loader" />
        <p>Synthesizing visual mind map hierarchy with AI...</p>
      </div>
    )
  }

  if (!mindmapData || !mindmapData.root) {
    return (
      <div className="mindmap-empty-box">
        <span className="empty-ico">🗺️</span>
        <h3>No Mind Map Generated Yet</h3>
        <p>Transform your study material into an interactive visual concept map.</p>
        <button type="button" className="btn-primary-action small" onClick={onRegenerate}>
          Generate Concept Mind Map
        </button>
      </div>
    )
  }

  return (
    <div className="mindmap-container">
      <div className="mindmap-header">
        <div>
          <h3>{mindmapData.title || 'Visual Knowledge Hierarchy'}</h3>
          <span className="mindmap-hint">Click branches to expand or collapse subtopics</span>
        </div>
        <button type="button" className="btn-secondary-action" onClick={onRegenerate}>
          ↻ Re-generate
        </button>
      </div>
      <div className="mindmap-tree-canvas">
        <TreeNode node={mindmapData.root} depth={0} />
      </div>
    </div>
  )
}
