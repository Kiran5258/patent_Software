import React, { useState, useEffect } from 'react';
import { FileText, FileImage, Download, Edit, Trash2, Calendar, User, Search, RefreshCw, ChevronRight } from 'lucide-react';
import api from '../utils/api';

const DocumentList = ({ onEdit }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [activeFilter] = useState('patent');

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const response = await api.get('/');
            setDocuments(response.data);
            setError('');
        } catch (err) {
            console.error('Error fetching documents:', err);
            setError('Failed to load documents.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this record and all its associated files?')) return;

        try {
            await api.delete(`/${id}`);
            fetchDocuments();
        } catch (err) {
            console.error('Error deleting document:', err);
            alert('Failed to delete.');
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const filteredDocs = documents.filter(doc =>
        (doc.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.applicant || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <RefreshCw className="animate-spin" size={48} color="var(--primary)" />
                    <p style={{ color: 'var(--text-muted)' }}>Loading records...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card animate-in" style={{ width: '100%', maxWidth: '1100px', margin: '2rem auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', gap: '2rem', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Saved Records</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Unified view of all generated patent documents and figure sets.</p>
                </div>

                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                    <input
                        type="text"
                        placeholder="Search records..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '3rem', width: '100%' }}
                    />
                </div>
            </div>

            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'grid', gap: '1rem' }}>
                {filteredDocs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
                        <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No records found.</p>
                    </div>
                ) : (
                    filteredDocs.map((doc) => (
                        <div key={doc._id} className="document-item" style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '20px',
                            padding: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.3s ease',
                            gap: '1.5rem',
                            flexWrap: 'wrap'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1, minWidth: '300px' }}>
                                <div style={{
                                    background: doc.type === 'patent' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: doc.type === 'patent' ? 'var(--primary)' : 'var(--accent)',
                                    flexShrink: 0
                                }}>
                                    {doc.type === 'patent' ? <FileText size={28} /> : <FileImage size={28} />}
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                                        <h3 style={{ fontSize: '1.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                                            {doc.title}
                                        </h3>
                                        <span style={{
                                            background: doc.type === 'patent' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                            color: doc.type === 'patent' ? 'var(--primary)' : 'var(--accent)',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase'
                                        }}>
                                            {doc.type}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <User size={14} /> {doc.applicant}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Calendar size={14} /> {formatDate(doc.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <button
                                    onClick={() => onEdit(doc)}
                                    className="btn-secondary"
                                    style={{ padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--glass-border)', cursor: 'pointer', background: 'transparent', color: 'white' }}
                                    title="Edit Metadata"
                                >
                                    <Edit size={18} />
                                </button>

                                <button
                                    onClick={() => handleDelete(doc._id)}
                                    className="btn-secondary"
                                    style={{ padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--glass-border)', cursor: 'pointer', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                                    title="Delete Record"
                                >
                                    <Trash2 size={18} />
                                </button>

                                {doc.downloadFile && (
                                    <a
                                        href={`http://localhost:5001/api/download/${doc.downloadFile}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary"
                                        style={{
                                            padding: '0.75rem 1.25rem',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.6rem',
                                            textDecoration: 'none',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            background: doc.type === 'patent' ? 'var(--primary)' : 'var(--accent)',
                                            color: 'white',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Download size={18} /> Download {doc.type === 'patent' ? 'ZIP' : 'DOC'}
                                    </a>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .document-item:hover {
                    background: rgba(255,255,255,0.06) !important;
                    transform: translateY(-2px);
                    border-color: rgba(99, 102, 241, 0.3) !important;
                    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
                }
            `}} />
        </div>
    );
};

export default DocumentList;
