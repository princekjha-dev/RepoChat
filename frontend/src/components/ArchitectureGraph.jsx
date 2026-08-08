import React, { useState } from 'react';

/**
 * ArchitectureGraph — Dynamic SVG Node & Cluster visualizer for indexed repositories.
 */
export default function ArchitectureGraph({ repoMeta, files = [] }) {
  const [activeNode, setActiveNode] = useState(null);

  // Group files by directory / module
  const modules = {};
  files.forEach((f) => {
    const parts = f.split('/');
    const dir = parts.length > 1 ? parts[0] : 'root';
    if (!modules[dir]) modules[dir] = [];
    modules[dir].push(f);
  });

  const moduleKeys = Object.keys(modules);
  const centerX = 300;
  const centerY = 180;
  const radius = 120;

  const nodes = moduleKeys.map((mod, i) => {
    const angle = (i / Math.max(moduleKeys.length, 1)) * 2 * Math.PI - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return {
      id: mod,
      label: mod,
      fileCount: modules[mod].length,
      x,
      y,
      files: modules[mod],
    };
  });

  return (
    <div
      className="apple-card"
      style={{
        padding: '24px',
        marginBottom: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F5F5F7', marginBottom: '4px' }}>
            System Architecture Map
          </h3>
          <p style={{ fontSize: '12px', color: '#86868B' }}>
            Interactive graph topology showing directory modules and code distribution.
          </p>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            padding: '4px 10px',
            background: 'rgba(41, 151, 255, 0.1)',
            border: '1px solid rgba(41, 151, 255, 0.25)',
            color: '#2997FF',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          {moduleKeys.length} Modules / {files.length} Files
        </span>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '360px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <svg width="100%" height="100%" viewBox="0 0 600 360" style={{ display: 'block' }}>
          {/* Connector lines to center */}
          {nodes.map((node) => (
            <line
              key={`line-${node.id}`}
              x1={centerX}
              y1={centerY}
              x2={node.x}
              y2={node.y}
              stroke={activeNode?.id === node.id ? '#2997FF' : 'rgba(255, 255, 255, 0.15)'}
              strokeWidth={activeNode?.id === node.id ? '2' : '1'}
              strokeDasharray={activeNode?.id === node.id ? 'none' : '4 4'}
            />
          ))}

          {/* Central Repo Core Node */}
          <g>
            <circle
              cx={centerX}
              cy={centerY}
              r="28"
              fill="rgba(41, 151, 255, 0.15)"
              stroke="#2997FF"
              strokeWidth="2"
            />
            <text
              x={centerX}
              y={centerY + 4}
              textAnchor="middle"
              fill="#F5F5F7"
              fontSize="11"
              fontWeight="600"
              fontFamily="var(--font-mono)"
            >
              CORE
            </text>
          </g>

          {/* Module Nodes */}
          {nodes.map((node) => {
            const isHovered = activeNode?.id === node.id;
            return (
              <g
                key={`node-${node.id}`}
                onClick={() => setActiveNode(node)}
                onMouseEnter={() => setActiveNode(node)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={Math.min(14 + node.fileCount * 1.5, 24)}
                  fill={isHovered ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)'}
                  stroke={isHovered ? '#2997FF' : 'rgba(255, 255, 255, 0.3)'}
                  strokeWidth={isHovered ? '2' : '1'}
                  style={{ transition: 'all 0.2s ease' }}
                />
                <text
                  x={node.x}
                  y={node.y + 35}
                  textAnchor="middle"
                  fill={isHovered ? '#F5F5F7' : '#86868B'}
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                  fontWeight={isHovered ? '600' : '400'}
                >
                  {node.label} ({node.fileCount})
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Node detail drawer */}
      {activeNode && (
        <div
          style={{
            padding: '14px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, color: '#2997FF', fontFamily: 'var(--font-mono)' }}>
              Module: {activeNode.label}
            </span>
            <span style={{ color: '#86868B', fontFamily: 'var(--font-mono)' }}>
              {activeNode.fileCount} files
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {activeNode.files.slice(0, 8).map((f) => (
              <span
                key={f}
                style={{
                  padding: '2px 8px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: '4px',
                  color: '#D1D1D6',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                }}
              >
                {f}
              </span>
            ))}
            {activeNode.files.length > 8 && (
              <span style={{ color: '#86868B', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                +{activeNode.files.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
