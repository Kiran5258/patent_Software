import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileImage, Send, CheckCircle, AlertCircle, Plus, Sparkles, ArrowLeft } from 'lucide-react';
import api from '../utils/api';

const FigureUpload = ({ initialData, onCancel, user }) => {
    const [files, setFiles] = useState([]);
    const [applicantName, setApplicantName] = useState('');
    const [patent_officer, setPatentOfficer] = useState('Albert Francis');
    const [signature, setSignature] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [downloadUrl, setDownloadUrl] = useState('');

    useEffect(() => {
        if (initialData) {
            setApplicantName(initialData.applicantName || '');
            setPatentOfficer(initialData.patent_officer || '');
            if (initialData.figures) setFiles(initialData.figures);
            if (initialData.signaturePath) setSignature(initialData.signaturePath);
        }
    }, [initialData]);

    const getImgUrl = (file) => {
        if (!file) return '';
        if (file.url) return file.url; // From Cloudinary
        if (typeof file === 'string') return file;
        return URL.createObjectURL(file); // Local preview
    };

    const onDrop = useCallback((acceptedFiles) => {
        setFiles(prev => [...prev, ...acceptedFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] }
    });

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        setError('');

        try {
            const formData = new FormData();
            formData.append('applicantName', applicantName);
            formData.append('patent_officer', patent_officer);

            files.forEach(file => {
                if (file instanceof File) {
                    formData.append('figures', file);
                } else {
                    // Keep existing figures on update
                    formData.append('existingFigures', JSON.stringify(file));
                }
            });

            if (signature instanceof File) {
                formData.append('signature', signature);
            } else if (signature) {
                formData.append('existingSignature', JSON.stringify(signature));
            }

            let response;
            if (initialData?._id) {
                response = await api.put(`/${initialData._id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                response = await api.post('/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            setSuccess(true);
            if (response.data.downloadUrl) {
                setDownloadUrl(response.data.downloadUrl);
            }

            setTimeout(() => {
                if (onCancel) onCancel();
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to generate figure document');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card animate-in" style={{ width: '100%', maxWidth: '900px', margin: '2rem auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                {onCancel && (
                    <button onClick={onCancel} className="btn-secondary" style={{ padding: '0.5rem' }}>
                        <ArrowLeft size={20} />
                    </button>
                )}
                <FileImage size={40} color="var(--accent)" />
                <div>
                    <h1 style={{ fontSize: '2rem' }}>{initialData ? 'EDIT FIGURE' : 'FIGURE DRAWINGS'}</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Generate professional figure documents.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid-cols-2">
                    <div className="input-group">
                        <label>Applicant Name</label>
                        <input
                            value={applicantName}
                            onChange={(e) => setApplicantName(e.target.value)}
                            placeholder="Full name"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Patent Officer</label>
                        <input
                            value={patent_officer}
                            onChange={(e) => setPatentOfficer(e.target.value)}
                            placeholder="Officer name"
                            required
                        />
                    </div>
                </div>

                <div
                    {...getRootProps()}
                    style={{
                        border: `2px dashed ${isDragActive ? 'var(--primary)' : 'var(--glass-border)'}`,
                        borderRadius: '24px',
                        padding: '2rem',
                        textAlign: 'center',
                        background: isDragActive ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        marginBottom: '1.5rem'
                    }}
                >
                    <input {...getInputProps()} />
                    <Upload size={32} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
                    <p>Drag & drop or click to upload drawings</p>
                </div>

                {files.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                        {files.map((f, i) => (
                            <div key={i} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                <img src={getImgUrl(f)} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                                <button type="button" onClick={() => removeFile(i)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'red', border: 'none', borderRadius: '50%', color: 'white', padding: '2px' }}>
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="input-group">
                    <label>Agent Signature</label>
                    <input type="file" onChange={(e) => setSignature(e.target.files[0])} accept="image/*" />
                    {signature && <img src={getImgUrl(signature)} style={{ height: '30px', marginTop: '0.5rem' }} />}
                </div>

                <button type="submit" disabled={loading || files.length === 0} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                    {loading ? 'Processing...' : (initialData ? 'Update Document' : 'Generate Document')}
                </button>

                {success && (
                    <div className="success-msg animate-in" style={{ marginTop: '1rem' }}>
                        <CheckCircle size={20} /> Success! Document generated.
                        {downloadUrl && (
                            <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/download-proxy?url=${encodeURIComponent(downloadUrl)}&filename=figures.docx`} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ marginLeft: '1rem', padding: '0.2rem 0.5rem' }}>
                                Download
                            </a>
                        )}
                    </div>
                )}

                {error && (
                    <div className="error-msg animate-in" style={{ marginTop: '1rem' }}>
                        <AlertCircle size={20} /> {error}
                    </div>
                )}
            </form>
        </div>
    );
};

export default FigureUpload;
