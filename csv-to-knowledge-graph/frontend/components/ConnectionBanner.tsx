'use client';

import React, { useState, useEffect } from 'react';
import { Link, CheckCircle } from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import DgraphConnection from '@/components/import/DgraphConnection';

interface ConnectionBannerProps {
  onConnectionChange?: (isConnected: boolean) => void;
}

export default function ConnectionBanner({ onConnectionChange }: ConnectionBannerProps) {
  const [showBanner, setShowBanner] = useState(true);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);

  // Use the connection store for all connection related functionality
  const { isConnected, isInitialized } = useConnectionStore();

  // Check if we've already shown the banner in this session
  useEffect(() => {
    const hasShownBanner = sessionStorage.getItem('hasShownConnectionBanner');
    if (hasShownBanner === 'true') {
      setShowBanner(false);
    }
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('hasShownConnectionBanner', 'true');
  };

  const handleSetupConnection = () => {
    setShowConnectionModal(true);
  };

  const handleConnectionModalClose = () => {
    setShowConnectionModal(false);
  };

  const handleConnectionChange = (connected: boolean) => {
    setConnectionSuccess(connected);

    if (onConnectionChange) {
      onConnectionChange(connected);
    }
  };

  // Don't show until we've checked the connection status
  if (!isInitialized) {
    return null;
  }

  if (!showBanner) return null;

  return (
    <>
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <Link className="h-5 w-5 text-purple-400" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-md font-medium text-white">Setup Your Dgraph Connection</h3>
            <div className="mt-2 text-sm text-gray-400">
              <p>
                {isConnected
                  ? "You're connected to Dgraph! You can import your data after creating a knowledge graph."
                  : 'Connect to your Dgraph instance to import your graph data. You can still explore and visualize data without connecting.'}
              </p>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={handleSetupConnection}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
              >
                {isConnected ? 'Connection Settings' : 'Setup Connection'}
              </button>
              <button
                onClick={handleDismiss}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-gray-400 bg-[#282828] hover:bg-[#333]"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1c1c1c] rounded-lg shadow-lg border border-[#2a2a2a] max-w-2xl w-full mx-4 p-6">
            <h2 className="text-xl font-medium text-white mb-4">Dgraph Connection Settings</h2>
            <DgraphConnection onConnectionChange={handleConnectionChange} className="mb-4" />
            <div className="flex justify-end mt-6">
              <div className="flex space-x-3">
                {connectionSuccess && (
                  <div className="flex items-center bg-green-900/20 text-green-400 px-4 py-2 rounded-md border border-green-800/40">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Connection successful!
                  </div>
                )}
                <button
                  onClick={handleConnectionModalClose}
                  className="px-4 py-2 bg-[#333] text-gray-300 border border-[#444] rounded-md hover:bg-[#444]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
