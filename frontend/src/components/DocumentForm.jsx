import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, FileText, Send, CheckCircle, ArrowLeft, Image as ImageIcon, Upload, X, FileImage, Sparkles } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import api from '../utils/api';

const EMPTY_ARRAY = [];

const DocumentForm = ({ initialData, onCancel, user }) => {
    const [formData, setFormData] = useState({
        TITLE: '',
        APPLICANT_NAME: '',
        APPLICANT_ADDRESS: '',
        email_id: '',
        technical_field: '',
        objective: '',
        summary: '',
        background: '',
        brief_description: '',
        detailed_description: '',
        abstract: '',
        claims: '',
        patent_officer: '',
        PANO: '',
        Name_of_Authorize: '',
        Mobile_No: '',
        officer_signature: null,
        figureImages: [],
        date: new Date().toISOString().split('T')[0],
        inventors: [{ inventor_name: '', inventor_address: '' }]
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [downloadUrl, setDownloadUrl] = useState('');

    const onDrop = useCallback((acceptedFiles) => {
        setFormData(prev => ({
            ...prev,
            figureImages: [...prev.figureImages, ...acceptedFiles]
        }));
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] }
    });

    const removeFigure = (index) => {
        setFormData(prev => ({
            ...prev,
            figureImages: prev.figureImages.filter((_, i) => i !== index)
        }));
    };

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                officer_signature: initialData.officer_signature || null,
                figureImages: initialData.figureImages || []
            });
        } else if (user) {
            let defaults = {};
            if (user.type === 'attorney') {
                defaults.patent_officer = "A. Albert Francis";
                defaults.PANO = "INPA-4655";
                defaults.Name_of_Authorize = "A. Albert Francis";
                defaults.Mobile_No = "9943235198";
            } else if (user.type === 'offline') {
                if (user.offlineMode === 'KRCE') {
                    defaults.APPLICANT_NAME = "K RAMAKRISHNAN COLLEGE OF ENGINEERING";
                    defaults.APPLICANT_ADDRESS = "The Principal, K.Ramakrishnan College of Engineering, NH-45, Samayapuram, Trichy, Tamil Nadu, India- 621112";
                } else if (user.offlineMode === 'KRCT') {
                    defaults.APPLICANT_NAME = "K RAMAKRISHNAN COLLEGE OF TECHNOLOGY";
                    defaults.APPLICANT_ADDRESS = "The Principal, K.Ramakrishnan College of Technology, NH-45, Samayapuram, Trichy, Tamil Nadu, India- 621112";
                } else if (user.offlineMode === 'MKCE') {
                    defaults.APPLICANT_NAME = "M. KUMARASAMY COLLEGE OF ENGINEERING";
                    defaults.APPLICANT_ADDRESS = "The Principal, M. Kumarasamy College of Engineering, Thalavapalayam, Karur-639113, TN, India";
                }
            }
            setFormData(prev => ({ ...prev, ...defaults }));
        }
    }, [initialData, user]);

    const applyTemplate = (college) => {
        const templates = {
            KRCE: {
                name: "K RAMAKRISHNAN COLLEGE OF ENGINEERING",
                address: "The Principal, K.Ramakrishnan College of Engineering, NH-45, Samayapuram, Trichy, Tamil Nadu, India- 621112"
            },
            KRCT: {
                name: "K RAMAKRISHNAN COLLEGE OF TECHNOLOGY",
                address: "The Principal, K.Ramakrishnan College of Technology, NH-45, Samayapuram, Trichy, Tamil Nadu, India- 621112"
            },
            MKCE: {
                name: "M. KUMARASAMY COLLEGE OF ENGINEERING",
                address: "The Principal, M. Kumarasamy College of Engineering, Thalavapalayam, Karur-639113, TN, India"
            }
        };

        if (templates[college]) {
            setFormData(prev => ({
                ...prev,
                APPLICANT_NAME: templates[college].name,
                APPLICANT_ADDRESS: templates[college].address
            }));
        }
    };

    const getImgUrl = (file) => {
        if (!file) return '';
        if (typeof file === 'string') {
            return `http://localhost:5001/${file}`;
        }
        return URL.createObjectURL(file);
    };

    const handleInputChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file') {
            setFormData(prev => ({ ...prev, [name]: files[0] }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleInventorChange = (index, field, value) => {
        const newInventors = [...formData.inventors];
        newInventors[index][field] = value;
        setFormData(prev => ({ ...prev, inventors: newInventors }));
    };

    const addInventor = () => {
        setFormData(prev => ({
            ...prev,
            inventors: [...prev.inventors, { inventor_name: '', inventor_address: '' }]
        }));
    };

    const removeInventor = (index) => {
        if (formData.inventors.length > 1) {
            const newInventors = formData.inventors.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, inventors: newInventors }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);
        setDownloadUrl('');

        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (key !== 'inventors' && key !== 'officer_signature' && key !== 'figureImages') {
                    data.append(key, formData[key]);
                }
            });

            if (formData.officer_signature instanceof File) {
                data.append('officer_signature', formData.officer_signature);
            }
            // For editing, we might need to tell backend about the existing signature if not changed
            if (typeof formData.officer_signature === 'string') {
                data.append('existing_signature', formData.officer_signature);
            }

            formData.figureImages.forEach(f => {
                if (f instanceof File) {
                    data.append('figures', f);
                } else {
                    data.append('existingFigures', f);
                }
            });

            data.append('inventors', JSON.stringify(formData.inventors));

            let response;
            if (formData._id) {
                response = await api.put(`/${formData._id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                if (!formData.figureImages || formData.figureImages.length === 0) {
                    setError('At least one Figure Drawing is required.');
                    setLoading(false);
                    return;
                }
                response = await api.post('/', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            setSuccess(true);
            if (response.data.downloadUrl) {
                setDownloadUrl(response.data.downloadUrl);
            }

            setTimeout(() => {
                setSuccess(false);
                setDownloadUrl('');
                if (onCancel && formData._id) onCancel();
            }, 5000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to generate documents.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card animate-in" style={{ width: '100%', maxWidth: '1000px', margin: '2rem auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <FileText size={40} color="var(--primary)" />
                    <div>
                        <h1 style={{ fontSize: '2rem' }}>{formData._id ? 'Edit Patent' : 'Patent Generator'}</h1>
                        <p style={{ color: 'var(--text-muted)' }}>{formData._id ? 'Update document metadata.' : 'Fill in the details to generate official patent documents.'}</p>
                    </div>
                </div>
                {onCancel && (
                    <button type="button" onClick={onCancel} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                        <ArrowLeft size={18} /> Back
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label>Project Title</label>
                    <input name="TITLE" placeholder="Enter title" value={formData.TITLE || ''} onChange={handleInputChange} required />
                </div>

                {!initialData && user?.type !== 'attorney' && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.75rem' }}>Quick Templates</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            {['KRCE', 'KRCT', 'MKCE'].map(lib => (
                                <button key={lib} type="button" onClick={() => applyTemplate(lib)} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
                                    {lib}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid-cols-2">
                    <div className="input-group">
                        <label>Applicant Name</label>
                        <input name="APPLICANT_NAME" value={formData.APPLICANT_NAME || ''} onChange={handleInputChange} required />
                    </div>
                    <div className="input-group">
                        <label>Email ID</label>
                        <input type="email" name="email_id" value={formData.email_id || ''} onChange={handleInputChange} required />
                    </div>
                </div>

                <div className="input-group">
                    <label>Applicant Address</label>
                    <textarea name="APPLICANT_ADDRESS" rows="2" value={formData.APPLICANT_ADDRESS} onChange={handleInputChange} required />
                </div>

                <div className="grid-cols-2">
                    <div className="input-group">
                        <label>Patent Officer / Authorizer</label>
                        <input name="patent_officer" value={formData.patent_officer || ''} onChange={handleInputChange} required />
                    </div>
                    {user?.type !== 'offline' && (
                        <div className="input-group">
                            <label>PANO</label>
                            <input name="PANO" value={formData.PANO || ''} onChange={handleInputChange} />
                        </div>
                    )}
                </div>

                {user?.type !== 'offline' && (
                    <>
                        <div className="grid-cols-2">
                            <div className="input-group">
                                <label>Mobile No</label>
                                <input name="Mobile_No" value={formData.Mobile_No || ''} onChange={handleInputChange} />
                            </div>
                            <div className="input-group">
                                <label>Name of Authorize</label>
                                <input name="Name_of_Authorize" value={formData.Name_of_Authorize || ''} onChange={handleInputChange} />
                            </div>
                        </div>
                        <div className="grid-cols-2">
                            <div className="input-group">
                                <label>Officer Signature (Optional)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <input type="file" name="officer_signature" accept="image/*" onChange={handleInputChange} style={{ flex: 1 }} />
                                    {formData.officer_signature && <img src={getImgUrl(formData.officer_signature)} alt="Preview" style={{ height: '40px' }} />}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div style={{ margin: '2rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3>Inventors</h3>
                        <button type="button" onClick={addInventor} className="btn-secondary" style={{ fontSize: '0.875rem' }}>
                            <Plus size={16} /> Add Inventor
                        </button>
                    </div>

                    {formData.inventors.map((inv, idx) => (
                        <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span>Inventor #{idx + 1}</span>
                                {formData.inventors.length > 1 && <button type="button" onClick={() => removeInventor(idx)} style={{ color: '#ef4444' }}><Trash2 size={16} /></button>}
                            </div>
                            <div className="grid-cols-2">
                                <div className="input-group"><label>Name</label><input value={inv.inventor_name} onChange={(e) => handleInventorChange(idx, 'inventor_name', e.target.value)} required /></div>
                                <div className="input-group"><label>Address</label><input value={inv.inventor_address} onChange={(e) => handleInventorChange(idx, 'inventor_address', e.target.value)} required /></div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="input-group">
                    <label>Technical Field</label>
                    <input name="technical_field" value={formData.technical_field} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                    <label>Background</label>
                    <textarea name="background" rows="3" value={formData.background} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                    <label>Objective of Invention</label>
                    <textarea name="objective" rows="3" value={formData.objective} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                    <label>Summary</label>
                    <textarea name="summary" rows="3" value={formData.summary} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                    <label>Brief Description of Drawings</label>
                    <textarea name="brief_description" rows="3" value={formData.brief_description} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                    <label>Detailed Description</label>
                    <textarea name="detailed_description" rows="6" value={formData.detailed_description} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                    <label>Abstract</label>
                    <textarea name="abstract" rows="3" value={formData.abstract} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                    <label>Claims</label>
                    <textarea name="claims" rows="4" value={formData.claims} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                    <label>Submission Date</label>
                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
                </div>

                <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <ImageIcon size={24} color="var(--primary)" />
                        <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Figure Drawings </h3>
                    </div>

                    <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? 'var(--primary)' : 'var(--glass-border)'}`, borderRadius: '24px', padding: '2.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', marginBottom: '1.5rem' }}>
                        <input {...getInputProps()} />
                        <Upload size={32} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                        <p>{isDragActive ? 'Drop drawings' : 'Drag & drop drawings or click'}</p>
                    </div>

                    {formData.figureImages.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                            {formData.figureImages.map((file, idx) => (
                                <div key={idx} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                    <img src={getImgUrl(file)} alt="Fig" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                                    <button type="button" onClick={() => removeFigure(idx)} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', color: 'white', padding: '4px' }}><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ marginTop: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '2rem', border: '1px solid var(--glass-border)' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}><Sparkles size={18} color="var(--primary)" /> Figure Preview</h4>
                        <div style={{ background: 'white', aspectRatio: '1/1.4', maxWidth: '350px', margin: '0 auto', padding: '2rem', color: '#333', fontSize: '0.45rem', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                <div style={{ textTransform: 'uppercase' }}>Applicant: {formData.APPLICANT_NAME || '...'}</div>
                                <div>No. of Sheets: {formData.figureImages.length || 0}</div>
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: 'bold', marginBottom: '1rem' }}>Sheet No: 1</div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', border: '1px dashed #ddd' }}>
                                {formData.figureImages.length > 0 ? (
                                    <img src={getImgUrl(formData.figureImages[0])} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#ccc' }}><Upload size={24} /><p>No drawings</p></div>
                                )}
                            </div>
                            <div style={{ borderTop: '1px solid #333', paddingTop: '0.4rem', marginTop: 'auto', textAlign: 'right' }}>
                                <div style={{ fontWeight: 'bold' }}>To, The Patent Officer,</div>
                                {formData.officer_signature && <img src={getImgUrl(formData.officer_signature)} style={{ height: '20px', margin: '3px 0' }} />}
                                <div style={{ fontWeight: 'bold' }}>Name: {formData.patent_officer || '...'}</div>
                                <div style={{ fontSize: '0.35rem' }}>Official Jurisdiction</div>
                            </div>
                        </div>
                    </div>
                </div>

                {error && <div style={{ color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '12px', margin: '1.5rem 0' }}>{error}</div>}

                {success && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                        <div style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={20} /> Documents ready!
                        </div>
                        {downloadUrl && user?.role === 'admin' && (
                            <a href={`http://localhost:5001${downloadUrl}`} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
                                Download ZIP
                            </a>
                        )}
                    </div>
                )}

                <button type="submit" disabled={loading} style={{ width: '100%', height: '3.5rem', marginTop: '1rem' }} className="btn-primary">
                    {loading ? 'Processing...' : <><Send size={20} /> Generate Documents</>}
                </button>
            </form>
        </div>
    );
};

export default DocumentForm;
