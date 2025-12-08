import React, { useState, useEffect } from "react";
import { blockchainAPI } from "../api";
import Card from "../components/Card";

function BlockExplorer() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBlock, setExpandedBlock] = useState(null);

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const response = await blockchainAPI.getBlocks();
        setBlocks(response.data.blocks || []);
      } catch (error) {
        console.error("Failed to fetch blocks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlocks();
    const interval = setInterval(fetchBlocks, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-4xl font-bold text-white mb-8">Block Explorer</h1>

      <Card>
        {loading ? (
          <p className="text-gray-400 text-center">Loading blocks...</p>
        ) : blocks.length === 0 ? (
          <p className="text-gray-400 text-center">No blocks yet</p>
        ) : (
          <div className="space-y-4">
            {blocks.map((block, idx) => (
              <div
                key={idx}
                className="bg-slate-700 rounded border border-slate-600 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedBlock(expandedBlock === idx ? null : idx)
                  }
                  className="w-full p-4 flex justify-between items-center hover:bg-slate-600 transition"
                >
                  <div className="text-left">
                    <h3 className="text-white font-bold">
                      Block #{block.index}
                    </h3>
                    <p className="text-gray-400 text-sm font-mono">
                      {block.hash?.substring(0, 32)}...
                    </p>
                  </div>
                  <span className="text-gray-400">
                    {expandedBlock === idx ? "▼" : "▶"}
                  </span>
                </button>

                {expandedBlock === idx && (
                  <div className="bg-slate-800 p-4 border-t border-slate-600 space-y-2">
                    <div>
                      <p className="text-gray-500 text-sm">Hash</p>
                      <p className="text-gray-200 font-mono text-xs break-all">
                        {block.hash}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500 text-sm">Previous Hash</p>
                      <p className="text-gray-200 font-mono text-xs break-all">
                        {block.previous_hash}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-500 text-sm">Nonce</p>
                        <p className="text-blue-400 font-bold">{block.nonce}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Difficulty</p>
                        <p className="text-blue-400 font-bold">
                          {block.difficulty}
                        </p>
                      </div>
                    </div>

                    {block.transactions && block.transactions.length > 0 && (
                      <div>
                        <p className="text-gray-500 text-sm">
                          Transactions ({block.transactions.length})
                        </p>
                        <div className="space-y-2">
                          {block.transactions.map((tx, txIdx) => (
                            <div
                              key={txIdx}
                              className="bg-slate-900 p-2 rounded text-xs"
                            >
                              <p className="text-gray-300">
                                <span className="text-green-400">
                                  {tx.sender}
                                </span>
                                {" → "}
                                <span className="text-blue-400">
                                  {tx.receiver}
                                </span>
                              </p>
                              <p className="text-yellow-400">
                                Amount: {tx.amount}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default BlockExplorer;
