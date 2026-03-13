import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, FileText, Send, CheckCircle, ArrowLeft, ArrowRight, Image as ImageIcon, Upload, X, FileImage, Sparkles, Info, Users, AlignLeft, FileCheck, FileCode, Paperclip } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import api from '../utils/api';

const EMPTY_ARRAY = [];

const TABS = [
    { id: 'PROJECT_INFO', label: 'Project Info', icon: Info },
    { id: 'INVENTORS', label: 'Inventors', icon: Users },
    { id: 'PREPARE_ALIGNMENT', label: 'Prepare Alignment', icon: AlignLeft },
    { id: 'CLAIMS', label: 'Claims', icon: FileCheck },
    { id: 'ABSTRACT', label: 'Abstract', icon: FileCode },
    { id: 'FIGURES', label: 'Figures', icon: Paperclip },
];

const DocumentForm = ({ initialData, onCancel, user }) => {
    const [formData, setFormData] = useState({
        TITLE: '',
        APPLICANT_NAME: '',
        APPLICANT_ADDRESS: '',
        email_id: 'ipmc@krce.ac.in',
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

    const [activeTab, setActiveTab] = useState('PROJECT_INFO');

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
                    defaults.patent_officer = "For K.Ramakrishnan College of Engineering";
                } else if (user.offlineMode === 'KRCT') {
                    defaults.APPLICANT_NAME = "K RAMAKRISHNAN COLLEGE OF TECHNOLOGY";
                    defaults.APPLICANT_ADDRESS = "The Principal, K.Ramakrishnan College of Technology, NH-45, Samayapuram, Trichy, Tamil Nadu, India- 621112";
                    defaults.patent_officer = "For K.Ramakrishnan College of Technology";
                } else if (user.offlineMode === 'MKCE') {
                    defaults.APPLICANT_NAME = "M. KUMARASAMY COLLEGE OF ENGINEERING";
                    defaults.APPLICANT_ADDRESS = "The Principal, M. Kumarasamy College of Engineering, Thalavapalayam, Karur-639113, TN, India";
                    defaults.patent_officer = "For M.Kumarasamy College of Engineering";
                }
            }
            setFormData(prev => ({ ...prev, ...defaults }));
        }
    }, [initialData, user]);

    const applyTemplate = (college) => {
        const templates = {
            KRCE: {
                name: "K.RAMAKRISHNAN COLLEGE OF ENGINEERING",
                address: "The Principal, K.Ramakrishnan College of Engineering, NH-45, Samayapuram, Trichy, Tamil Nadu, India- 621112",
                officer: "For K.Ramakrishnan College of Engineering"
            },
            KRCT: {
                name: "K.RAMAKRISHNAN COLLEGE OF TECHNOLOGY",
                address: "The Principal, K.Ramakrishnan College of Technology, Kariyamanikam Road, Samayapuram, Trichy, Tamil Nadu, India- 621112",
                officer: "For K.Ramakrishnan College of Technology"
            },
            MKCE: {
                name: "M.KUMARASAMY COLLEGE OF ENGINEERING",
                address: "The Principal, M.Kumarasamy College of Engineering, Thalavapalayam, Karur-639113, TN, India",
                officer: "For M.Kumarasamy College of Engineering"
            }
        };

        if (templates[college]) {
            setFormData(prev => ({
                ...prev,
                APPLICANT_NAME: templates[college].name,
                APPLICANT_ADDRESS: templates[college].address,
                patent_officer: templates[college].officer
            }));
        }
    };

    const getImgUrl = (file) => {
        if (!file) return '';
        if (file.url) return file.url; // From Cloudinary
        if (typeof file === 'string') return file;
        return URL.createObjectURL(file); // Local preview
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

            // Append all textual fields
            Object.keys(formData).forEach(key => {
                if (key !== 'inventors' && key !== 'officer_signature' && key !== 'figureImages') {
                    data.append(key, formData[key]);
                }
            });

            // Append inventors as JSON string
            data.append('inventors', JSON.stringify(formData.inventors));

            // Append signature
            if (formData.officer_signature instanceof File) {
                data.append('officer_signature', formData.officer_signature);
            } else if (formData.officer_signature) {
                data.append('existingSignature', JSON.stringify(formData.officer_signature));
            }

            // Append figures
            formData.figureImages.forEach(f => {
                if (f instanceof File) {
                    data.append('figures', f);
                } else {
                    data.append('existingFigures', JSON.stringify(f));
                }
            });

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

            // After 5 seconds, reset the form for a new entry
            setTimeout(() => {
                setSuccess(false);
                setDownloadUrl('');
                if (onCancel && formData._id) {
                    onCancel(); // Close edit form
                } else {
                    resetForm(); // Reset generator for new document
                }
            }, 5000);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to generate documents.');
        } finally {
            setLoading(false);
        }
    };

    const validateTab = (tabId) => {
        setError('');
        switch (tabId) {
            case 'PROJECT_INFO':
                if (!formData.TITLE || !formData.APPLICANT_NAME || !formData.APPLICANT_ADDRESS || !formData.patent_officer || !formData.date) {
                    setError('Please fill in all required Project Info fields.');
                    return false;
                }
                break;
            case 'INVENTORS':
                const invalidInventor = formData.inventors.some(inv => !inv.inventor_name || !inv.inventor_address);
                if (invalidInventor) {
                    setError('Please fill in all inventor details.');
                    return false;
                }
                break;
            case 'PREPARE_ALIGNMENT':
                if (!formData.technical_field || !formData.background || !formData.objective || !formData.summary || !formData.brief_description || !formData.detailed_description) {
                    setError('Please complete all alignment sections (Technical Field, Background, etc.).');
                    return false;
                }
                break;
            case 'CLAIMS':
                if (!formData.claims) {
                    setError('Please enter the patent claims.');
                    return false;
                }
                break;
            case 'ABSTRACT':
                if (!formData.abstract) {
                    setError('Please enter the patent abstract.');
                    return false;
                }
                break;
            default:
                break;
        }
        return true;
    };

    const nextTab = () => {
        if (!validateTab(activeTab)) return;

        const currentIndex = TABS.findIndex(t => t.id === activeTab);
        if (currentIndex < TABS.length - 1) {
            setActiveTab(TABS[currentIndex + 1].id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const prevTab = () => {
        const currentIndex = TABS.findIndex(t => t.id === activeTab);
        if (currentIndex > 0) {
            setActiveTab(TABS[currentIndex - 1].id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleTabClick = (tabId) => {
        const targetIndex = TABS.findIndex(t => t.id === tabId);
        const currentIndex = TABS.findIndex(t => t.id === activeTab);

        if (targetIndex > currentIndex) {
            // Trying to go forward - check current tab first
            if (!validateTab(activeTab)) return;
            // Also check all intermediate tabs (optional but safer)
            for (let i = currentIndex; i < targetIndex; i++) {
                if (!validateTab(TABS[i].id)) {
                    setActiveTab(TABS[i].id);
                    return;
                }
            }
        }
        setActiveTab(tabId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        let defaults = {
            TITLE: '',
            APPLICANT_NAME: '',
            APPLICANT_ADDRESS: '',
            email_id: 'ipmc@krce.ac.in',
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
        };

        if (user) {
            let userDefaults = {};
            if (user.type === 'attorney') {
                userDefaults.patent_officer = "A. Albert Francis";
                userDefaults.PANO = "INPA-4655";
                userDefaults.Name_of_Authorize = "A. Albert Francis";
                userDefaults.Mobile_No = "9943235198";
            } else if (user.type === 'offline') {
                if (user.offlineMode === 'KRCE') {
                    userDefaults.APPLICANT_NAME = "K RAMAKRISHNAN COLLEGE OF ENGINEERING";
                    userDefaults.APPLICANT_ADDRESS = "The Principal, K.Ramakrishnan College of Engineering, NH-45, Samayapuram, Trichy, Tamil Nadu, India- 621112";
                    userDefaults.patent_officer = "For K.Ramakrishnan College of Engineering";
                } else if (user.offlineMode === 'KRCT') {
                    userDefaults.APPLICANT_NAME = "K RAMAKRISHNAN COLLEGE OF TECHNOLOGY";
                    userDefaults.APPLICANT_ADDRESS = "The Principal, K.Ramakrishnan College of Technology, NH-45, Samayapuram, Trichy, Tamil Nadu, India- 621112";
                    userDefaults.patent_officer = "For K.Ramakrishnan College of Technology";
                } else if (user.offlineMode === 'MKCE') {
                    userDefaults.APPLICANT_NAME = "M. KUMARASAMY COLLEGE OF ENGINEERING";
                    userDefaults.APPLICANT_ADDRESS = "The Principal, M. Kumarasamy College of Engineering, Thalavapalayam, Karur-639113, TN, India";
                    userDefaults.patent_officer = "For M.Kumarasamy College of Engineering";
                }
            }
            Object.assign(defaults, userDefaults);
        }

        setFormData(defaults);
        setActiveTab('PROJECT_INFO');
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                        <ArrowLeft size={18} /> Back to Dashboard
                    </button>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="tabs-container">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => handleTabClick(tab.id)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <tab.icon size={16} />
                            {tab.label}
                        </div>
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="tab-content">
                    {activeTab === 'PROJECT_INFO' && (
                        <div className="animate-in">
                            <div className="input-group">
                                <label>Project Title</label>
                                <input name="TITLE" placeholder="Enter title" value={formData.TITLE || ''} onChange={handleInputChange} required />
                            </div>

                            {user && user.type !== 'attorney' && (
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

                            <div className="input-group">
                                <label>Submission Date</label>
                                <input className='date' type="date" name="date" value={formData.date} onChange={handleInputChange} required />
                            </div>

                            <div className="grid-cols-2">
                                <div className="input-group">
                                    <label>Applicant Name</label>
                                    <input name="APPLICANT_NAME" value={formData.APPLICANT_NAME || ''} onChange={handleInputChange} required />
                                </div>
                                <div className="input-group">
                                    <label>Email ID</label>
                                    <input type="email" name="email_id" value={formData.email_id || 'ipmc@krce.ac.in'} onChange={handleInputChange} required />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Applicant Address</label>
                                <textarea name="APPLICANT_ADDRESS" rows="2" value={formData.APPLICANT_ADDRESS} onChange={handleInputChange} required />
                            </div>

                            <div className="grid-cols-2">
                                <div className="input-group">
                                    <label>Patent Officer</label>
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
                                    <div className="input-group">
                                        <label>Officer Signature (Optional)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <input type="file" name="officer_signature" accept="image/*" onChange={handleInputChange} style={{ flex: 1 }} />
                                            {formData.officer_signature && <img src={getImgUrl(formData.officer_signature)} alt="Preview" style={{ height: '40px' }} />}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'INVENTORS' && (
                        <div className="animate-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h3>Inventors List</h3>
                                <button type="button" onClick={addInventor} className="btn-secondary" style={{ fontSize: '0.875rem' }}>
                                    <Plus size={16} /> Add Inventor
                                </button>
                            </div>

                            {formData.inventors.map((inv, idx) => (
                                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Inventor #{idx + 1}</span>
                                        {formData.inventors.length > 1 && (
                                            <button type="button" onClick={() => removeInventor(idx)} style={{ background: 'transparent', color: '#ef4444', padding: '0.25rem' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid-cols-2">
                                        <div className="input-group">
                                            <label>Full Name</label>
                                            <input value={inv.inventor_name} onChange={(e) => handleInventorChange(idx, 'inventor_name', e.target.value)} required />
                                        </div>
                                        <div className="input-group">
                                            <label>Address</label>
                                            <input value={inv.inventor_address} onChange={(e) => handleInventorChange(idx, 'inventor_address', e.target.value)} required />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'PREPARE_ALIGNMENT' && (
                        <div className="animate-in spec-section">
                            <div className="spec-field">
                                <label><AlignLeft size={18} /> Technical Field</label>
                                <textarea name="technical_field" rows="3" value={formData.technical_field} onChange={handleInputChange} required placeholder="Describe the technical area of the invention..." />
                            </div>
                            <div className="spec-field">
                                <label><AlignLeft size={18} /> Background</label>
                                <textarea name="background" rows="4" value={formData.background} onChange={handleInputChange} required placeholder="Describe the background and existing problems..." />
                            </div>
                            <div className="spec-field">
                                <label><AlignLeft size={18} /> Objective of Invention</label>
                                <textarea name="objective" rows="3" value={formData.objective} onChange={handleInputChange} required placeholder="What are the main goals of this invention?" />
                            </div>
                            <div className="spec-field">
                                <label><AlignLeft size={18} /> Summary</label>
                                <textarea name="summary" rows="4" value={formData.summary} onChange={handleInputChange} required placeholder="Provide a brief summary of the invention..." />
                            </div>
                            <div className="spec-field">
                                <label><AlignLeft size={18} /> Brief Description of Drawings</label>
                                <textarea name="brief_description" rows="3" value={formData.brief_description} onChange={handleInputChange} required placeholder="e.g., FIG. 1 is a perspective view of..." />
                            </div>
                            <div className="spec-field">
                                <label><AlignLeft size={18} /> Detailed Description</label>
                                <textarea name="detailed_description" rows="10" value={formData.detailed_description} onChange={handleInputChange} required placeholder="Provide a complete, detailed explanation of the invention..." />
                            </div>
                        </div>
                    )}

                    {activeTab === 'CLAIMS' && (
                        <div className="animate-in">
                            <div className="spec-field">
                                <label><FileCheck size={18} /> Claims</label>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Define the scope of protection. Start each claim with a number (e.g., 1. A device comprising...).</p>
                                <textarea name="claims" rows="15" value={formData.claims} onChange={handleInputChange} required placeholder="1. An apparatus comprising..." />
                            </div>
                        </div>
                    )}

                    {activeTab === 'ABSTRACT' && (
                        <div className="animate-in">
                            <div className="spec-field">
                                <label><FileCode size={18} /> Abstract</label>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Summarize the technical disclosure in 150 words or less.</p>
                                <textarea name="abstract" rows="10" value={formData.abstract} onChange={handleInputChange} required placeholder="A brief summary of the technical features..." />
                                <div style={{ textAlign: 'right', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                    Word count: {formData.abstract.split(/\s+/).filter(Boolean).length}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'FIGURES' && (
                        <div className="animate-in">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <ImageIcon size={24} color="var(--primary)" />
                                <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Figure Drawings </h3>
                            </div>

                            <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? 'var(--primary)' : 'var(--glass-border)'}`, borderRadius: '24px', padding: '2.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', marginBottom: '1.5rem' }}>
                                <input {...getInputProps()} />
                                <Upload size={32} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                                <p>{isDragActive ? 'Drop drawings here' : 'Drag & drop drawings or click to select'}</p>
                            </div>

                            {formData.figureImages.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                    {formData.figureImages.map((file, idx) => (
                                        <div key={idx} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)' }}>
                                            <img src={getImgUrl(file)} alt="Fig" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', padding: '4px' }} />
                                            <button type="button" onClick={() => removeFigure(idx)} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(223, 68, 68, 0.8)', borderRadius: '50%', color: 'white', padding: '4px' }}><X size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ marginTop: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '2rem', border: '1px solid var(--glass-border)' }}>
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}><Sparkles size={18} color="var(--primary)" /> Pro-View Sheet 1</h4>
                                <div style={{ background: 'white', aspectRatio: '1/1.4', maxWidth: '350px', margin: '0 auto', padding: '2rem', color: '#333', fontSize: '0.45rem', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', borderRadius: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                        <div style={{ textTransform: 'uppercase' }}>Applicant: {formData.APPLICANT_NAME || '................'}</div>
                                        <div>No. of Sheets: {formData.figureImages.length || 0}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', fontWeight: 'bold', marginBottom: '1rem' }}>Sheet No: 1</div>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fcfcfc', border: '1px dashed #eee' }}>
                                        {formData.figureImages.length > 0 ? (
                                            <img src={getImgUrl(formData.figureImages[0])} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                        ) : (
                                            <div style={{ textAlign: 'center', color: '#ccc' }}><Upload size={24} /><p>No drawings uploaded</p></div>
                                        )}
                                    </div>
                                    <div style={{ borderTop: '1px solid #333', paddingTop: '0.4rem', marginTop: 'auto', textAlign: 'right' }}>
                                        {formData.officer_signature && <img src={getImgUrl(formData.officer_signature)} style={{ height: '20px', margin: '3px 0' }} />}
                                        <div style={{ fontWeight: 'bold' }}> {formData.patent_officer || '................'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {error && <div style={{ color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '12px', margin: '1.5rem 0' }}>{error}</div>}

                {success && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                        <div style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={20} /> Documents re-generated successfully!
                        </div>
                        {downloadUrl && (
                            <a
                                href={`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/download-proxy?url=${encodeURIComponent(downloadUrl)}&filename=${formData._id || 'patent'}.zip`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary"
                                style={{ marginTop: '1rem', display: 'inline-flex' }}
                            >
                                Download Final ZIP
                            </a>
                        )}
                    </div>
                )}

                <div className="form-navigation">
                    {activeTab !== 'PROJECT_INFO' ? (
                        <button type="button" onClick={prevTab} className="btn-secondary">
                            <ArrowLeft size={18} /> Previous Section
                        </button>
                    ) : <div></div>}

                    {activeTab !== 'FIGURES' ? (
                        <button type="button" onClick={nextTab} className="btn-primary">
                            Next Section <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.75rem 2.5rem' }}>
                            {loading ? 'Generating...' : <><Send size={20} /> Generate All Documents</>}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default DocumentForm;
