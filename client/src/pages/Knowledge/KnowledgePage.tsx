import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  X,
  FileCode,
  Layers,
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { apiClient } from '../../api/client';
import { DocumentItem, DocumentChunk } from '../../types';

export const KnowledgePage: React.FC = () => {
  const { activeCompany } = useTenant();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [docChunks, setDocChunks] = useState<DocumentChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    if (!activeCompany) return;
    try {
      const res = await apiClient<{ documents: DocumentItem[] }>(
        `/api/app/companies/${activeCompany.id}/documents`
      );
      setDocuments(res.documents || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeCompany]);

  // Polling for processing / indexing status updates
  useEffect(() => {
    const hasPending = documents.some((d) => ['uploading', 'processing', 'indexing'].includes(d.status));
    if (!hasPending) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 2500);

    return () => clearInterval(interval);
  }, [documents, activeCompany]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeCompany) return;

    const file = files[0];
    const validExts = ['.pdf', '.docx', '.txt', '.md'];
    const isVal = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!isVal) {
      setError('Unsupported file type. Please upload PDF, DOCX, TXT, or Markdown documents.');
      return;
    }

    setError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await apiClient(`/api/app/companies/${activeCompany.id}/documents`, {
        method: 'POST',
        body: formData,
      });
      await fetchDocuments();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    if (!activeCompany || !confirm('Are you sure you want to delete this document and its vector embeddings?')) return;
    try {
      await apiClient(`/api/app/companies/${activeCompany.id}/documents/${docId}`, {
        method: 'DELETE',
      });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDoc?.id === docId) setSelectedDoc(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReindex = async (docId: string) => {
    if (!activeCompany) return;
    try {
      await apiClient(`/api/app/companies/${activeCompany.id}/documents/${docId}/reindex`, {
        method: 'POST',
      });
      await fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const inspectChunks = async (doc: DocumentItem) => {
    if (!activeCompany) return;
    setSelectedDoc(doc);
    setLoadingChunks(true);
    try {
      const res = await apiClient<{ chunks: DocumentChunk[] }>(
        `/api/app/companies/${activeCompany.id}/documents/${doc.id}`
      );
      setDocChunks(res.chunks || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingChunks(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderStatusBadge = (status: DocumentItem['status'], errorMsg: string | null) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ready (Indexed)</span>
          </span>
        );
      case 'indexing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>Generating Embeddings...</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span>Extracting Text...</span>
          </span>
        );
      case 'uploading':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Uploading...</span>
          </span>
        );
      case 'failed':
        return (
          <span
            title={errorMsg || 'Processing failed'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 cursor-help"
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            <span>Failed</span>
          </span>
        );
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-600" />
            <span>Knowledge Base</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload policies, user guides, or manuals to build your company's vector knowledge base.
          </p>
        </div>

        <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer self-start md:self-auto">
          <UploadCloud className="w-4 h-4" />
          <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
        className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 transition-all text-center flex flex-col items-center justify-center cursor-pointer group shadow-2xs"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-12 h-12 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 transition-colors">
          <UploadCloud className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          Drag & drop company documents here, or <span className="text-indigo-600 underline">browse files</span>
        </h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Supports PDF (with page detection), Microsoft Word (.docx), Plain Text (.txt), and Markdown (.md)
        </p>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Indexed Documents ({documents.length})
          </div>
          <button
            onClick={fetchDocuments}
            title="Refresh list"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Loading documents...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 mb-1">No documents yet</h3>
            <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">
              Upload your company documents to give your AI agent knowledge.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Document Name</th>
                  <th className="px-6 py-3.5">Size</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Chunks</th>
                  <th className="px-6 py-3.5">Uploaded</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          {doc.file_name.endsWith('.pdf') ? (
                            <FileText className="w-4 h-4 text-red-500" />
                          ) : (
                            <FileCode className="w-4 h-4 text-indigo-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{doc.file_name}</div>
                          {doc.error_message && (
                            <div className="text-[10px] text-red-600 truncate max-w-xs">{doc.error_message}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500">
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="px-6 py-4">
                      {renderStatusBadge(doc.status, doc.error_message)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        {doc.chunk_count || 0} chunks
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {doc.status === 'ready' && (
                          <button
                            onClick={() => inspectChunks(doc)}
                            title="Inspect Vector Chunks"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleReindex(doc.id)}
                          title="Re-index document"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          title="Delete document"
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chunk Inspection Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Indexed Chunks for: {selectedDoc.file_name}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {docChunks.length} vector chunks stored in pgvector for this document
                </p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {loadingChunks ? (
                <div className="text-center py-12 text-slate-400 flex items-center justify-center gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Loading chunks...</span>
                </div>
              ) : docChunks.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">No chunks found for this document.</p>
              ) : (
                docChunks.map((chunk, idx) => (
                  <div key={chunk.id || idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                        Chunk #{idx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        {chunk.page_number && <span>Page {chunk.page_number}</span>}
                        {chunk.section && <span className="text-slate-600 truncate max-w-xs">{chunk.section}</span>}
                      </div>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                      {chunk.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
