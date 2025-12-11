import React, { useState, useEffect } from "react";
import { blockchainAPI, transactionAPI } from "../api";

function BlockExplorer() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [expandedTx, setExpandedTx] = useState(null);
  const [txDetails, setTxDetails] = useState({});
  const [chainLength, setChainLength] = useState(0);

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const response = await blockchainAPI.getBlocks();
        setBlocks(response.data.blocks || []);
        setChainLength(response.data.chain_length || 0);
      } catch (error) {
        console.error("Failed to fetch blocks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlocks();
    const interval = setInterval(fetchBlocks, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 p-2 rounded-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </span>
            Block Explorer
          </h1>
          <p className="text-slate-400 mt-2">
            Explore the blockchain and view all mined blocks
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Chain Length</p>
            <p className="text-2xl font-bold text-white">{chainLength}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Latest Block</p>
            <p className="text-2xl font-bold text-amber-400">
              #{blocks.length > 0 ? blocks[blocks.length - 1]?.index : 0}
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Difficulty</p>
            <p className="text-2xl font-bold text-purple-400">
              {blocks.length > 0 ? blocks[0]?.difficulty : 5}
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Blocks</p>
            <p className="text-2xl font-bold text-emerald-400">
              {blocks.length}
            </p>
          </div>
        </div>

        {/* Blockchain Visualization */}
        <div className="mb-8 overflow-x-auto pb-4">
          <div className="flex items-center gap-2 min-w-max">
            {blocks.slice(-10).map((block, idx) => (
              <React.Fragment key={idx}>
                <button
                  onClick={() =>
                    setExpandedBlock(
                      expandedBlock === block.index ? null : block.index
                    )
                  }
                  className={`flex-shrink-0 w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-200 ${
                    expandedBlock === block.index
                      ? "bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/20"
                      : "bg-slate-800/50 border-slate-700 hover:border-amber-500/50"
                  }`}
                >
                  <span className="text-amber-400 font-bold">
                    #{block.index}
                  </span>
                  <span className="text-slate-400 text-xs mt-1">
                    {block.transactions?.length || 0} txs
                  </span>
                </button>
                {idx < blocks.slice(-10).length - 1 && (
                  <div className="flex-shrink-0 w-8 h-0.5 bg-gradient-to-r from-slate-600 to-slate-700"></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Blocks List */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold text-white">All Blocks</h3>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-400">Loading blocks...</p>
            </div>
          ) : blocks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                No blocks yet
              </h3>
              <p className="text-slate-400 text-sm">
                The blockchain will appear here once blocks are mined.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {[...blocks].reverse().map((block, idx) => (
                <div key={idx} className="hover:bg-slate-700/30 transition-all">
                  <button
                    onClick={() =>
                      setExpandedBlock(
                        expandedBlock === block.index ? null : block.index
                      )
                    }
                    className="w-full p-5 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold">
                          #{block.index}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          Block #{block.index}
                        </p>
                        <p className="text-slate-400 text-sm font-mono">
                          {block.hash?.substring(0, 24)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-slate-400 text-sm">
                          {formatTimestamp(block.timestamp)}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {block.transactions?.length || 0} transactions
                        </p>
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform ${
                          expandedBlock === block.index ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {expandedBlock === block.index && (
                    <div className="px-5 pb-5">
                      <div className="bg-slate-900/50 rounded-xl p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">
                              Hash
                            </p>
                            <p className="text-slate-300 font-mono text-sm break-all bg-slate-800/50 p-2 rounded-lg">
                              {block.hash}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">
                              Previous Hash
                            </p>
                            <p className="text-slate-300 font-mono text-sm break-all bg-slate-800/50 p-2 rounded-lg">
                              {block.previous_hash}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <p className="text-slate-500 text-xs">Nonce</p>
                            <p className="text-blue-400 font-bold text-lg">
                              {block.nonce?.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <p className="text-slate-500 text-xs">Difficulty</p>
                            <p className="text-purple-400 font-bold text-lg">
                              {block.difficulty}
                            </p>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <p className="text-slate-500 text-xs">Timestamp</p>
                            <p className="text-amber-400 font-bold text-lg">
                              {block.timestamp}
                            </p>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <p className="text-slate-500 text-xs">
                              Transactions
                            </p>
                            <p className="text-emerald-400 font-bold text-lg">
                              {block.transactions?.length || 0}
                            </p>
                          </div>
                        </div>

                        {block.transactions &&
                          block.transactions.length > 0 && (
                            <div>
                              <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">
                                Transactions
                              </p>
                              <div className="space-y-2">
                                {block.transactions.map((tx, txIdx) => {
                                  const txId =
                                    typeof tx === "string" ? tx : tx.id;
                                  const isExpanded = expandedTx === txId;
                                  const details = txDetails[txId];

                                  return (
                                    <div
                                      key={txIdx}
                                      className="bg-slate-800/50 rounded-lg overflow-hidden"
                                    >
                                      <button
                                        onClick={async () => {
                                          if (isExpanded) {
                                            setExpandedTx(null);
                                          } else {
                                            setExpandedTx(txId);
                                            if (!txDetails[txId]) {
                                              try {
                                                const res =
                                                  await transactionAPI.getDetails(
                                                    txId
                                                  );
                                                setTxDetails((prev) => ({
                                                  ...prev,
                                                  [txId]: res.data,
                                                }));
                                              } catch (e) {
                                                console.error(
                                                  "Failed to fetch tx details:",
                                                  e
                                                );
                                              }
                                            }
                                          }
                                        }}
                                        className="w-full p-3 flex items-center justify-between hover:bg-slate-700/30 transition-all"
                                      >
                                        <span className="text-slate-300 font-mono text-sm">
                                          {txId?.substring(0, 24)}...
                                        </span>
                                        <div className="flex items-center gap-2">
                                          {typeof tx === "object" &&
                                            tx.amount && (
                                              <span className="text-yellow-400 font-bold">
                                                {tx.amount} coins
                                              </span>
                                            )}
                                          <svg
                                            className={`w-4 h-4 text-slate-400 transition-transform ${
                                              isExpanded ? "rotate-180" : ""
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M19 9l-7 7-7-7"
                                            />
                                          </svg>
                                        </div>
                                      </button>

                                      {isExpanded && details && (
                                        <div className="p-4 border-t border-slate-700/50 bg-slate-900/50 space-y-3">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                              <p className="text-slate-500 text-xs">
                                                Sender
                                              </p>
                                              <p className="text-slate-300 font-mono text-xs break-all">
                                                {details.sender_wallet_id}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-slate-500 text-xs">
                                                Receiver
                                              </p>
                                              <p className="text-slate-300 font-mono text-xs break-all">
                                                {details.receiver_wallet_id}
                                              </p>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            <div className="bg-slate-800 rounded p-2">
                                              <p className="text-slate-500 text-xs">
                                                Amount
                                              </p>
                                              <p className="text-yellow-400 font-bold">
                                                {details.amount}
                                              </p>
                                            </div>
                                            <div className="bg-slate-800 rounded p-2">
                                              <p className="text-slate-500 text-xs">
                                                Type
                                              </p>
                                              <p className="text-blue-400 font-medium text-sm">
                                                {details.tx_type}
                                              </p>
                                            </div>
                                            <div className="bg-slate-800 rounded p-2">
                                              <p className="text-slate-500 text-xs">
                                                Status
                                              </p>
                                              <p className="text-emerald-400 font-medium text-sm">
                                                {details.status}
                                              </p>
                                            </div>
                                            <div className="bg-slate-800 rounded p-2">
                                              <p className="text-slate-500 text-xs">
                                                IP
                                              </p>
                                              <p className="text-slate-300 font-mono text-xs">
                                                {details.ip_address}
                                              </p>
                                            </div>
                                          </div>

                                          {details.note && (
                                            <div>
                                              <p className="text-slate-500 text-xs">
                                                Note
                                              </p>
                                              <p className="text-slate-300 text-sm">
                                                {details.note}
                                              </p>
                                            </div>
                                          )}

                                          {/* Digital Signature Section */}
                                          <div className="border-t border-slate-700/50 pt-3 mt-3">
                                            <p className="text-amber-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                                              <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                                />
                                              </svg>
                                              Digital Signature Verification
                                            </p>

                                            <div className="space-y-2">
                                              <div>
                                                <p className="text-slate-500 text-xs">
                                                  Sender Public Key (Base64)
                                                </p>
                                                <p className="text-emerald-400 font-mono text-xs break-all bg-slate-800 p-2 rounded">
                                                  {details.sender_pub_base64 ||
                                                    "N/A"}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-slate-500 text-xs">
                                                  Signature (Base64)
                                                </p>
                                                <p className="text-purple-400 font-mono text-xs break-all bg-slate-800 p-2 rounded">
                                                  {details.signature_base64 ||
                                                    "N/A"}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-2 text-emerald-400 text-xs">
                                                <svg
                                                  className="w-4 h-4"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M5 13l4 4L19 7"
                                                  />
                                                </svg>
                                                Signature verified using Ed25519
                                                algorithm
                                              </div>
                                            </div>
                                          </div>

                                          <div className="text-slate-500 text-xs">
                                            Created:{" "}
                                            {new Date(
                                              details.created_at
                                            ).toLocaleString()}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BlockExplorer;
