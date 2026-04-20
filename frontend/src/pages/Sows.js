import React, { useState, useEffect } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';

function Sows() {
    const [sows, setSows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [breeds, setBreeds] = useState([]);
    const [selectedSow, setSelectedSow] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showHeatForm, setShowHeatForm] = useState(false);
    const [showBreedingForm, setShowBreedingForm] = useState(false);
    const [showPregnancyForm, setShowPregnancyForm] = useState(false);
    const [showFarrowingForm, setShowFarrowingForm] = useState(false);
    const [showWeaningForm, setShowWeaningForm] = useState(false);
    const [showHealthForm, setShowHealthForm] = useState(false);
    
    const [stats, setStats] = useState({
        total: 0,
        pregnant: 0,
        lactating: 0,
        heat: 0,
        active: 0,
        culled: 0,
        averageLitters: 0,
        averagePiglets: 0,
        survivalRate: 0
    });

    const [newSow, setNewSow] = useState({
        tag_number: '',
        name: '',
        breed_id: '',
        birth_date: '',
        source: 'born',
        purchase_date: '',
        purchase_price: '',
        identification_marks: '',
        status: 'active',
        notes: ''
    });

    const [heatRecord, setHeatRecord] = useState({
        sow_id: '',
        heat_date: new Date().toISOString().split('T')[0],
        observed_by: '',
        notes: ''
    });

    const [breedingRecord, setBreedingRecord] = useState({
        sow_id: '',
        breeding_date: new Date().toISOString().split('T')[0],
        method: 'natural',
        boar_id: '',
        semen_batch: '',
        staff: '',
        notes: ''
    });

    const [pregnancyRecord, setPregnancyRecord] = useState({
        sow_id: '',
        confirmation_date: new Date().toISOString().split('T')[0],
        confirmation_method: 'ultrasound',
        expected_farrowing: '',
        notes: ''
    });

    const [farrowingRecord, setFarrowingRecord] = useState({
        sow_id: '',
        farrowing_date: new Date().toISOString().split('T')[0],
        total_born: '',
        live_births: '',
        stillbirths: '',
        weak_piglets: '',
        complications: '',
        notes: ''
    });

    const [weaningRecord, setWeaningRecord] = useState({
        sow_id: '',
        weaning_date: new Date().toISOString().split('T')[0],
        piglets_weaned: '',
        mortality: '',
        notes: ''
    });

    const [healthRecord, setHealthRecord] = useState({
        sow_id: '',
        record_date: new Date().toISOString().split('T')[0],
        record_type: 'vaccination',
        diagnosis: '',
        treatment: '',
        medication: '',
        dosage: '',
        administered_by: '',
        next_due: '',
        notes: ''
    });

    useEffect(() => {
        fetchSows();
        fetchBreeds();
    }, []);

    const fetchSows = async () => {
        setLoading(true);
        try {
            const res = await API.get('/sows');
            setSows(res.data);
            calculateStats(res.data);
        } catch (error) {
            console.error('Error fetching sows:', error);
            toast.error('Failed to load sows');
        } finally {
            setLoading(false);
        }
    };

    const fetchBreeds = async () => {
        try {
            const res = await API.get('/breeds');
            setBreeds(res.data);
        } catch (error) {
            console.error('Error fetching breeds:', error);
        }
    };

    const calculateStats = (sowData) => {
        const total = sowData.length;
        const pregnant = sowData.filter(s => s.status === 'pregnant').length;
        const lactating = sowData.filter(s => s.status === 'lactating').length;
        const heat = sowData.filter(s => s.status === 'heat').length;
        const active = sowData.filter(s => s.status === 'active').length;
        const culled = sowData.filter(s => s.status === 'sold' || s.status === 'deceased').length;
        
        const totalLitters = sowData.reduce((sum, s) => sum + (s.litter_count || 0), 0);
        const totalPiglets = sowData.reduce((sum, s) => sum + (s.total_piglets || 0), 0);
        const totalWeaned = sowData.reduce((sum, s) => sum + (s.weaned_piglets || 0), 0);
        
        const avgLitters = total > 0 ? (totalLitters / total).toFixed(1) : 0;
        const avgPiglets = totalLitters > 0 ? (totalPiglets / totalLitters).toFixed(1) : 0;
        const survivalRate = totalPiglets > 0 ? ((totalWeaned / totalPiglets) * 100).toFixed(1) : 0;
        
        setStats({
            total,
            pregnant,
            lactating,
            heat,
            active,
            culled,
            averageLitters: avgLitters,
            averagePiglets: avgPiglets,
            survivalRate
        });
    };

    const handleAddSow = async (e) => {
        e.preventDefault();
        try {
            await API.post('/sows', newSow);
            toast.success('Sow registered successfully!');
            setShowForm(false);
            setNewSow({
                tag_number: '',
                name: '',
                breed_id: '',
                birth_date: '',
                source: 'born',
                purchase_date: '',
                purchase_price: '',
                identification_marks: '',
                status: 'active',
                notes: ''
            });
            fetchSows();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to register sow');
        }
    };

    const handleHeatRecord = async (e) => {
        e.preventDefault();
        try {
            await API.put(`/sows/${heatRecord.sow_id}/status`, { status: 'heat' });
            await API.put(`/sows/${heatRecord.sow_id}/reproductive`, {
                last_heat: heatRecord.heat_date,
                reproductive_status: 'heat'
            });

            setSows(prevSows => 
                prevSows.map(sow => 
                    sow.id === heatRecord.sow_id 
                        ? { ...sow, status: 'heat', last_heat: heatRecord.heat_date, reproductive_status: 'heat' } 
                        : sow
                )
            );
            calculateStats(sows.map(sow => 
                sow.id === heatRecord.sow_id ? { ...sow, status: 'heat' } : sow
            ));
            toast.success('Heat recorded successfully');
            setShowHeatForm(false);
            fetchSows();
        } catch (error) {
            toast.error('Failed to record heat');
        }
    };

    const handleBreedingRecord = async (e) => {
        e.preventDefault();
        try {
            const expectedFarrowing = new Date(breedingRecord.breeding_date);
            expectedFarrowing.setDate(expectedFarrowing.getDate() + 114);
            const expected = expectedFarrowing.toISOString().split('T')[0];
            
            await API.put(`/sows/${breedingRecord.sow_id}/status`, { status: 'active' });
            await API.put(`/sows/${breedingRecord.sow_id}/reproductive`, {
                last_breeding: breedingRecord.breeding_date,
                expected_farrowing: expected,
                breeding_method: breedingRecord.method,
                boar_id: breedingRecord.boar_id,
                reproductive_status: 'bred'
            });

            setSows(prevSows => 
                prevSows.map(sow => 
                    sow.id === breedingRecord.sow_id 
                        ? { ...sow, last_breeding: breedingRecord.breeding_date, expected_farrowing: expected, breeding_method: breedingRecord.method, boar_id: breedingRecord.boar_id } 
                        : sow
                )
            );
            toast.success('Breeding recorded successfully');
            setShowBreedingForm(false);
            fetchSows();
        } catch (error) {
            toast.error('Failed to record breeding');
        }
    };

    const handlePregnancyConfirm = async (e) => {
        e.preventDefault();
        try {
            await API.put(`/sows/${pregnancyRecord.sow_id}/status`, { status: 'pregnant' });
            await API.put(`/sows/${pregnancyRecord.sow_id}/reproductive`, {
                expected_farrowing: pregnancyRecord.expected_farrowing,
                pregnancy_confirmation_date: pregnancyRecord.confirmation_date,
                reproductive_status: 'pregnant'
            });

            setSows(prevSows => 
                prevSows.map(sow => 
                    sow.id === pregnancyRecord.sow_id 
                        ? { ...sow, status: 'pregnant', expected_farrowing: pregnancyRecord.expected_farrowing } 
                        : sow
                )
            );
            toast.success('Pregnancy confirmed');
            setShowPregnancyForm(false);
            fetchSows();
        } catch (error) {
            toast.error('Failed to confirm pregnancy');
        }
    };

    const handleFarrowingRecord = async (e) => {
        e.preventDefault();
        
        if (!farrowingRecord.sow_id) {
            toast.error('Please select a sow');
            return;
        }
        
        if (!farrowingRecord.total_born || !farrowingRecord.live_births) {
            toast.error('Please enter total born and live births');
            return;
        }
        
        try {
            await API.put(`/sows/${farrowingRecord.sow_id}/status`, { status: 'lactating' });
            
            await API.put(`/sows/${farrowingRecord.sow_id}/reproductive`, {
                last_farrowing: farrowingRecord.farrowing_date,
                reproductive_status: 'lactating',
                total_piglets: (sows.find(s => s.id === farrowingRecord.sow_id)?.total_piglets || 0) + parseInt(farrowingRecord.total_born)
            });
            
            await API.post('/litters', {
                sow_id: farrowingRecord.sow_id,
                farrowing_date: farrowingRecord.farrowing_date,
                total_born: farrowingRecord.total_born,
                born_alive: farrowingRecord.live_births,
                stillborn: farrowingRecord.stillbirths || 0,
                weak_piglets: farrowingRecord.weak_piglets || 0,
                notes: farrowingRecord.notes
            });
            
            const updatedSows = sows.map(sow => 
                sow.id === farrowingRecord.sow_id 
                    ? { 
                        ...sow, 
                        status: 'lactating', 
                        last_farrowing: farrowingRecord.farrowing_date,
                        litter_count: (sow.litter_count || 0) + 1,
                        total_piglets: (sow.total_piglets || 0) + parseInt(farrowingRecord.total_born)
                      } 
                    : sow
            );
            
            setSows(updatedSows);
            calculateStats(updatedSows);
            
            toast.success('Farrowing recorded successfully!');
            setShowFarrowingForm(false);
            
            setFarrowingRecord({
                sow_id: '',
                farrowing_date: new Date().toISOString().split('T')[0],
                total_born: '',
                live_births: '',
                stillbirths: '',
                weak_piglets: '',
                complications: '',
                notes: ''
            });
            
            fetchSows();
            
        } catch (error) {
            console.error('❌ Farrowing record error:', error.response?.data || error.message);
            toast.error(error.response?.data?.error || 'Failed to record farrowing');
        }
    };

    const handleWeaningRecord = async (e) => {
        e.preventDefault();
        
        if (!weaningRecord.sow_id) {
            toast.error('Please select a sow');
            return;
        }
        
        if (!weaningRecord.piglets_weaned) {
            toast.error('Please enter number of piglets weaned');
            return;
        }
        
        try {
            await API.put(`/sows/${weaningRecord.sow_id}/status`, { status: 'active' });
            
            await API.put(`/sows/${weaningRecord.sow_id}/reproductive`, {
                weaning_date: weaningRecord.weaning_date,
                reproductive_status: 'active',
                weaned_piglets: (sows.find(s => s.id === weaningRecord.sow_id)?.weaned_piglets || 0) + parseInt(weaningRecord.piglets_weaned)
            });
            
            const updatedSows = sows.map(sow => 
                sow.id === weaningRecord.sow_id 
                    ? { 
                        ...sow, 
                        status: 'active',
                        weaning_date: weaningRecord.weaning_date,
                        weaned_piglets: (sow.weaned_piglets || 0) + parseInt(weaningRecord.piglets_weaned)
                      } 
                    : sow
            );
            
            setSows(updatedSows);
            calculateStats(updatedSows);
            
            toast.success('Weaning recorded successfully!');
            setShowWeaningForm(false);
            
            setWeaningRecord({
                sow_id: '',
                weaning_date: new Date().toISOString().split('T')[0],
                piglets_weaned: '',
                mortality: '',
                notes: ''
            });
            
            fetchSows();
            
        } catch (error) {
            console.error('❌ Weaning record error:', error.response?.data || error.message);
            toast.error(error.response?.data?.error || 'Failed to record weaning');
        }
    };

    const handleHealthRecord = async (e) => {
        e.preventDefault();
        try {
            await API.post('/health', {
                animal_id: healthRecord.sow_id,
                animal_type: 'sow',
                record_type: healthRecord.record_type,
                date_administered: healthRecord.record_date,
                next_due_date: healthRecord.next_due,
                diagnosis: healthRecord.diagnosis,
                medication: healthRecord.medication,
                dosage: healthRecord.dosage,
                administered_by: healthRecord.administered_by,
                notes: healthRecord.notes
            });
            toast.success('Health record added');
            setShowHealthForm(false);
            fetchSows();
        } catch (error) {
            toast.error('Failed to add health record');
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'pregnant': return '#ff1493';
            case 'lactating': return '#4CAF50';
            case 'heat': return '#ff9800';
            case 'active': return '#2196F3';
            case 'sold': return '#f44336';
            case 'deceased': return '#888';
            default: return '#888';
        }
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'pregnant': return '🤰';
            case 'lactating': return '🍼';
            case 'heat': return '🔥';
            case 'active': return '✅';
            case 'sold': return '💰';
            case 'deceased': return '💀';
            default: return '🐷';
        }
    };

    const getStatusBadge = (status) => {
        if (!status) return null;
        return (
            <span style={{
                backgroundColor: getStatusColor(status),
                color: '#000',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                {getStatusIcon(status)} {status.toUpperCase()}
            </span>
        );
    };

    const filteredSows = sows
        .filter(sow => filter === 'all' || sow.status === filter)
        .filter(sow => 
            sow.tag_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sow.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sow.breed_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    if (loading) {
        return (
            <div style={{ 
                padding: '30px', 
                marginLeft: '280px', 
                backgroundColor: '#000', 
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <div style={{ color: '#ff1493' }}>Loading sows...</div>
            </div>
        );
    }

    return (
        <div style={{ 
            padding: '20px', 
            marginLeft: '0px', 
            backgroundColor: '#0a0a0a', 
            minHeight: '100vh',
            color: '#fff'
        }}>
            {/* Header with Stats */}
            <div style={{ 
                background: 'linear-gradient(135deg, #ff1493 0%, #ff0000 100%)',
                borderRadius: '20px',
                padding: '30px',
                marginBottom: '30px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h1 style={{ color: '#fff', margin: 0, fontSize: '2.5em' }}>
                        🐷 Sows Management
                    </h1>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        style={{
                            backgroundColor: '#fff',
                            color: '#ff1493',
                            border: 'none',
                            padding: '15px 30px',
                            borderRadius: '50px',
                            fontSize: '1.1em',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        {showForm ? '✕ Cancel' : '+ Register New Sow'}
                    </button>
                </div>

                {/* Stats Cards */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '15px'
                }}>
                    <StatCard icon="🐷" value={stats.total} label="Total Sows" />
                    <StatCard icon="🤰" value={stats.pregnant} label="Pregnant" />
                    <StatCard icon="🍼" value={stats.lactating} label="Lactating" />
                    <StatCard icon="🔥" value={stats.heat} label="In Heat" />
                    <StatCard icon="✅" value={stats.active} label="Active" />
                    <StatCard icon="📊" value={stats.averageLitters} label="Avg Litters" />
                    <StatCard icon="🐖" value={stats.averagePiglets} label="Avg Piglets" />
                    <StatCard icon="💚" value={stats.survivalRate + '%'} label="Survival Rate" />
                </div>
            </div>

            {/* Search and Filter */}
            <div style={{ 
                display: 'flex', 
                gap: '20px', 
                marginBottom: '30px',
                flexWrap: 'wrap'
            }}>
                <input
                    type="text"
                    placeholder="🔍 Search by ID, name, or breed..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        flex: 1,
                        padding: '15px',
                        backgroundColor: '#1a1a1a',
                        border: '2px solid #ff1493',
                        borderRadius: '50px',
                        color: '#fff',
                        fontSize: '1em'
                    }}
                />
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{
                        padding: '15px 30px',
                        backgroundColor: '#1a1a1a',
                        border: '2px solid #ff1493',
                        borderRadius: '50px',
                        color: '#fff',
                        fontSize: '1em'
                    }}
                >
                    <option value="all">All Sows</option>
                    <option value="active">Active</option>
                    <option value="pregnant">Pregnant</option>
                    <option value="lactating">Lactating</option>
                    <option value="heat">In Heat</option>
                    <option value="sold">Sold</option>
                    <option value="deceased">Deceased</option>
                </select>
            </div>

            {/* Registration Form */}
            {showForm && (
                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: '2px solid #ff1493',
                    borderRadius: '20px',
                    padding: '30px',
                    marginBottom: '30px'
                }}>
                    <h3 style={{ color: '#ff1493', marginBottom: '20px', fontSize: '1.5em' }}>Register New Sow</h3>
                    <form onSubmit={handleAddSow}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                            <div><label style={{ color: '#ff1493', display: 'block', marginBottom: '5px' }}>Tag Number *</label>
                                <input type="text" value={newSow.tag_number} onChange={(e) => setNewSow({...newSow, tag_number: e.target.value})} style={inputStyle} required /></div>
                            <div><label style={{ color: '#ff1493', display: 'block', marginBottom: '5px' }}>Name</label>
                                <input type="text" value={newSow.name} onChange={(e) => setNewSow({...newSow, name: e.target.value})} style={inputStyle} /></div>
                            <div><label style={{ color: '#ff1493', display: 'block', marginBottom: '5px' }}>Breed</label>
                                <select value={newSow.breed_id} onChange={(e) => setNewSow({...newSow, breed_id: e.target.value})} style={inputStyle}>
                                    <option value="">Select Breed</option>
                                    {breeds.map(breed => (<option key={breed.id} value={breed.id}>{breed.name}</option>))}
                                </select></div>
                            <div><label style={{ color: '#ff1493', display: 'block', marginBottom: '5px' }}>Birth Date</label>
                                <input type="date" value={newSow.birth_date} onChange={(e) => setNewSow({...newSow, birth_date: e.target.value})} style={inputStyle} /></div>
                            <div><label style={{ color: '#ff1493', display: 'block', marginBottom: '5px' }}>Source</label>
                                <select value={newSow.source} onChange={(e) => setNewSow({...newSow, source: e.target.value})} style={inputStyle}>
                                    <option value="born">Born on Farm</option><option value="purchased">Purchased</option>
                                </select></div>
                            {newSow.source === 'purchased' && (<>
                                <div><label style={{ color: '#ff1493', display: 'block', marginBottom: '5px' }}>Purchase Date</label>
                                    <input type="date" value={newSow.purchase_date} onChange={(e) => setNewSow({...newSow, purchase_date: e.target.value})} style={inputStyle} /></div>
                                <div><label style={{ color: '#ff1493', display: 'block', marginBottom: '5px' }}>Purchase Price ($)</label>
                                    <input type="number" step="0.01" value={newSow.purchase_price} onChange={(e) => setNewSow({...newSow, purchase_price: e.target.value})} style={inputStyle} /></div>
                            </>)}
                            <div><label style={{ color: '#ff1493', display: 'block', marginBottom: '5px' }}>Identification Marks</label>
                                <input type="text" value={newSow.identification_marks} onChange={(e) => setNewSow({...newSow, identification_marks: e.target.value})} style={inputStyle} /></div>
                            <div><label style={{ color: '#ff1493', display: 'block', marginBottom: '5px' }}>Initial Status</label>
                                <select value={newSow.status} onChange={(e) => setNewSow({...newSow, status: e.target.value})} style={inputStyle}>
                                    <option value="active">Active</option><option value="pregnant">Pregnant</option>
                                    <option value="lactating">Lactating</option><option value="heat">Heat</option>
                                </select></div>
                            <div style={{ gridColumn: 'span 2' }}><label style={{ color: '#ff1493', display: 'block', marginBottom: '5px' }}>Notes</label>
                                <textarea value={newSow.notes} onChange={(e) => setNewSow({...newSow, notes: e.target.value})} style={{...inputStyle, minHeight: '100px'}} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button type="button" onClick={() => setShowForm(false)} style={cancelButtonStyle}>Cancel</button>
                            <button type="submit" style={submitButtonStyle}>Register Sow</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
                <QuickActionButton icon="🔥" label="Record Heat" onClick={() => setShowHeatForm(true)} color="#ff9800" />
                <QuickActionButton icon="🤰" label="Record Breeding" onClick={() => setShowBreedingForm(true)} color="#ff1493" />
                <QuickActionButton icon="✅" label="Confirm Pregnancy" onClick={() => setShowPregnancyForm(true)} color="#4CAF50" />
                <QuickActionButton icon="🐖" label="Record Farrowing" onClick={() => setShowFarrowingForm(true)} color="#2196F3" />
                <QuickActionButton icon="🍼" label="Record Weaning" onClick={() => setShowWeaningForm(true)} color="#9C27B0" />
                <QuickActionButton icon="💉" label="Health Record" onClick={() => setShowHealthForm(true)} color="#f44336" />
            </div>

            {/* Sows Grid */}
            {filteredSows.length === 0 ? (
                <EmptyState onAddClick={() => setShowForm(true)} />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '25px' }}>
                    {filteredSows.map(sow => (
                        <SowCard 
                            key={sow.id}
                            sow={sow}
                            onView={() => { setSelectedSow(sow); setShowDetails(true); }}
                            getStatusBadge={getStatusBadge}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            {showHeatForm && <HeatFormModal sows={sows} heatRecord={heatRecord} setHeatRecord={setHeatRecord} onSubmit={handleHeatRecord} onClose={() => setShowHeatForm(false)} />}
            {showBreedingForm && <BreedingFormModal sows={sows} breedingRecord={breedingRecord} setBreedingRecord={setBreedingRecord} onSubmit={handleBreedingRecord} onClose={() => setShowBreedingForm(false)} />}
            {showPregnancyForm && <PregnancyFormModal sows={sows} pregnancyRecord={pregnancyRecord} setPregnancyRecord={setPregnancyRecord} onSubmit={handlePregnancyConfirm} onClose={() => setShowPregnancyForm(false)} />}
            {showFarrowingForm && <FarrowingFormModal sows={sows} farrowingRecord={farrowingRecord} setFarrowingRecord={setFarrowingRecord} onSubmit={handleFarrowingRecord} onClose={() => setShowFarrowingForm(false)} />}
            {showWeaningForm && <WeaningFormModal sows={sows} weaningRecord={weaningRecord} setWeaningRecord={setWeaningRecord} onSubmit={handleWeaningRecord} onClose={() => setShowWeaningForm(false)} />}
            {showHealthForm && <HealthFormModal sows={sows} healthRecord={healthRecord} setHealthRecord={setHealthRecord} onSubmit={handleHealthRecord} onClose={() => setShowHealthForm(false)} />}

            {/* Sow Details Modal */}
            {showDetails && selectedSow && (
                <SowDetailsModal
                    sow={selectedSow}
                    onClose={() => setShowDetails(false)}
                    getStatusBadge={getStatusBadge}
                    onAction={(action) => {
                        setShowDetails(false);
                        if (action === 'heat') { setHeatRecord({...heatRecord, sow_id: selectedSow.id}); setShowHeatForm(true); }
                        if (action === 'breed') { setBreedingRecord({...breedingRecord, sow_id: selectedSow.id}); setShowBreedingForm(true); }
                        if (action === 'pregnancy') { setPregnancyRecord({...pregnancyRecord, sow_id: selectedSow.id}); setShowPregnancyForm(true); }
                        if (action === 'farrow') { setFarrowingRecord({...farrowingRecord, sow_id: selectedSow.id}); setShowFarrowingForm(true); }
                        if (action === 'wean') { setWeaningRecord({...weaningRecord, sow_id: selectedSow.id}); setShowWeaningForm(true); }
                        if (action === 'health') { setHealthRecord({...healthRecord, sow_id: selectedSow.id}); setShowHealthForm(true); }
                    }}
                />
            )}
        </div>
    );
}

// Helper Components
const StatCard = ({ icon, value, label }) => (
    <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '15px', padding: '15px', textAlign: 'center' }}>
        <div style={{ fontSize: '2em', marginBottom: '5px' }}>{icon}</div>
        <div style={{ color: '#fff', fontSize: '1.5em', fontWeight: 'bold' }}>{value}</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9em' }}>{label}</div>
    </div>
);

const QuickActionButton = ({ icon, label, onClick, color }) => (
    <button onClick={onClick} style={{ flex: 1, minWidth: '120px', padding: '12px', backgroundColor: color, color: '#000', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.2em' }}>{icon}</span>{label}
    </button>
);

const SowCard = ({ sow, onView, getStatusBadge }) => (
    <div style={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '20px', padding: '20px', cursor: 'pointer', transition: 'all 0.3s' }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(255,20,147,0.3)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        onClick={onView}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div><h3 style={{ color: '#ff1493', margin: 0, fontSize: '1.3em' }}>{sow.tag_number}</h3><p style={{ color: '#fff', margin: '5px 0 0 0' }}>{sow.name}</p></div>
            {getStatusBadge(sow.status)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', backgroundColor: '#000', padding: '15px', borderRadius: '10px', marginBottom: '10px' }}>
            <InfoItem label="Breed" value={sow.breed_name} />
            <InfoItem label="Parity" value={sow.litter_count || 0} />
            <InfoItem label="Last Farrowing" value={sow.last_farrowing ? new Date(sow.last_farrowing).toLocaleDateString() : 'N/A'} />
            <InfoItem label="Avg Litter" value={sow.average_litter_size || 0} />
        </div>
        {sow.status === 'pregnant' && sow.expected_farrowing && (
            <div style={{ backgroundColor: '#ff1493', padding: '10px', borderRadius: '10px', marginBottom: '10px', textAlign: 'center', color: '#000', fontWeight: 'bold' }}>
                Expected: {new Date(sow.expected_farrowing).toLocaleDateString()} ({Math.ceil((new Date(sow.expected_farrowing) - new Date()) / (1000 * 60 * 60 * 24))} days)
            </div>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
            <button style={{ flex: 1, padding: '8px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>View History</button>
        </div>
    </div>
);

const InfoItem = ({ label, value }) => (<div><span style={{ color: '#888', fontSize: '0.9em' }}>{label}:</span><span style={{ color: '#fff', marginLeft: '5px', fontWeight: 'bold' }}>{value}</span></div>);

const EmptyState = ({ onAddClick }) => (
    <div style={{ backgroundColor: '#1a1a1a', border: '2px dashed #ff1493', borderRadius: '20px', padding: '80px 50px', textAlign: 'center' }}>
        <div style={{ fontSize: '5em', marginBottom: '20px' }}>🐷</div>
        <h2 style={{ color: '#ff1493', marginBottom: '10px' }}>No Sows Registered</h2>
        <p style={{ color: '#888', fontSize: '1.2em', marginBottom: '30px' }}>Start by registering your first sow</p>
        <button onClick={onAddClick} style={{ backgroundColor: '#ff1493', color: '#000', border: 'none', padding: '15px 40px', borderRadius: '50px', fontSize: '1.2em', fontWeight: 'bold', cursor: 'pointer' }}>+ Register First Sow</button>
    </div>
);

const inputStyle = { width: '100%', padding: '10px', backgroundColor: '#000', border: '2px solid #ff1493', borderRadius: '8px', color: '#fff' };
const cancelButtonStyle = { padding: '10px 30px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const submitButtonStyle = { padding: '10px 30px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };

// Modal Components
const HeatFormModal = ({ sows, heatRecord, setHeatRecord, onSubmit, onClose }) => (
    <div style={modalOverlayStyle}><div style={modalContentStyle}>
        <h2 style={{ color: '#ff9800', marginBottom: '20px' }}>🔥 Record Heat Detection</h2>
        <form onSubmit={onSubmit}>
            <div style={modalFormGroup}><label style={modalLabel}>Select Sow *</label>
                <select value={heatRecord.sow_id} onChange={(e) => setHeatRecord({...heatRecord, sow_id: parseInt(e.target.value)})} style={modalInput} required>
                    <option value="">Select Sow</option>
                    {sows.filter(s => s.status !== 'sold' && s.status !== 'deceased').map(sow => (
                        <option key={sow.id} value={sow.id}>{sow.tag_number} - {sow.name || 'Unnamed'} ({sow.status})</option>
                    ))}
                </select>
            </div>
            <div style={modalFormGroup}><label style={modalLabel}>Heat Date *</label>
                <input type="date" value={heatRecord.heat_date} onChange={(e) => setHeatRecord({...heatRecord, heat_date: e.target.value})} style={modalInput} required /></div>
            <div style={modalFormGroup}><label style={modalLabel}>Observed By</label>
                <input type="text" value={heatRecord.observed_by} onChange={(e) => setHeatRecord({...heatRecord, observed_by: e.target.value})} style={modalInput} placeholder="Staff name" /></div>
            <div style={modalFormGroup}><label style={modalLabel}>Notes</label>
                <textarea value={heatRecord.notes} onChange={(e) => setHeatRecord({...heatRecord, notes: e.target.value})} style={{...modalInput, minHeight: '80px'}} placeholder="Observations..." /></div>
            <div style={modalButtonGroup}><button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                <button type="submit" style={{...modalSubmitButton, backgroundColor: '#ff9800'}}>Record Heat</button></div>
        </form>
    </div></div>
);

const BreedingFormModal = ({ sows, breedingRecord, setBreedingRecord, onSubmit, onClose }) => (
    <div style={modalOverlayStyle}><div style={modalContentStyle}>
        <h2 style={{ color: '#ff1493', marginBottom: '20px' }}>🤰 Record Breeding</h2>
        <form onSubmit={onSubmit}>
            <div style={modalFormGroup}><label style={modalLabel}>Select Sow *</label>
                <select value={breedingRecord.sow_id} onChange={(e) => setBreedingRecord({...breedingRecord, sow_id: parseInt(e.target.value)})} style={modalInput} required>
                    <option value="">Select Sow</option>
                    {sows.filter(s => s.status === 'heat' || s.status === 'active').map(sow => (
                        <option key={sow.id} value={sow.id}>{sow.tag_number} - {sow.name || 'Unnamed'} ({sow.status})</option>
                    ))}
                </select>
            </div>
            <div style={modalFormGroup}><label style={modalLabel}>Breeding Date *</label>
                <input type="date" value={breedingRecord.breeding_date} onChange={(e) => setBreedingRecord({...breedingRecord, breeding_date: e.target.value})} style={modalInput} required /></div>
            <div style={modalFormGroup}><label style={modalLabel}>Method *</label>
                <select value={breedingRecord.method} onChange={(e) => setBreedingRecord({...breedingRecord, method: e.target.value})} style={modalInput} required>
                    <option value="natural">Natural Mating</option><option value="ai">Artificial Insemination</option>
                </select></div>
            {breedingRecord.method === 'natural' ? (
                <div style={modalFormGroup}><label style={modalLabel}>Boar ID *</label>
                    <input type="text" value={breedingRecord.boar_id} onChange={(e) => setBreedingRecord({...breedingRecord, boar_id: e.target.value})} style={modalInput} placeholder="e.g., B001" required /></div>
            ) : (
                <div style={modalFormGroup}><label style={modalLabel}>Semen Batch *</label>
                    <input type="text" value={breedingRecord.semen_batch} onChange={(e) => setBreedingRecord({...breedingRecord, semen_batch: e.target.value})} style={modalInput} placeholder="Batch number" required /></div>
            )}
            <div style={modalFormGroup}><label style={modalLabel}>Staff Responsible</label>
                <input type="text" value={breedingRecord.staff} onChange={(e) => setBreedingRecord({...breedingRecord, staff: e.target.value})} style={modalInput} /></div>
            <div style={modalFormGroup}><label style={modalLabel}>Notes</label>
                <textarea value={breedingRecord.notes} onChange={(e) => setBreedingRecord({...breedingRecord, notes: e.target.value})} style={{...modalInput, minHeight: '80px'}} /></div>
            <div style={modalButtonGroup}><button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                <button type="submit" style={{...modalSubmitButton, backgroundColor: '#ff1493'}}>Record Breeding</button></div>
        </form>
    </div></div>
);

const PregnancyFormModal = ({ sows, pregnancyRecord, setPregnancyRecord, onSubmit, onClose }) => (
    <div style={modalOverlayStyle}><div style={modalContentStyle}>
        <h2 style={{ color: '#4CAF50', marginBottom: '20px' }}>✅ Confirm Pregnancy</h2>
        <form onSubmit={onSubmit}>
            <div style={modalFormGroup}><label style={modalLabel}>Select Sow *</label>
                <select value={pregnancyRecord.sow_id} onChange={(e) => setPregnancyRecord({...pregnancyRecord, sow_id: parseInt(e.target.value)})} style={modalInput} required>
                    <option value="">Select Sow</option>
                    {sows.filter(s => s.status === 'active').map(sow => (
                        <option key={sow.id} value={sow.id}>{sow.tag_number} - {sow.name || 'Unnamed'} (Last bred: {sow.last_breeding ? new Date(sow.last_breeding).toLocaleDateString() : 'Unknown'})</option>
                    ))}
                </select>
            </div>
            <div style={modalFormGroup}><label style={modalLabel}>Confirmation Date *</label>
                <input type="date" value={pregnancyRecord.confirmation_date} onChange={(e) => setPregnancyRecord({...pregnancyRecord, confirmation_date: e.target.value})} style={modalInput} required /></div>
            <div style={modalFormGroup}><label style={modalLabel}>Confirmation Method *</label>
                <select value={pregnancyRecord.confirmation_method} onChange={(e) => setPregnancyRecord({...pregnancyRecord, confirmation_method: e.target.value})} style={modalInput} required>
                    <option value="ultrasound">Ultrasound</option><option value="heat_return">Heat Return Check</option><option value="visual">Visual/Experienced</option>
                </select></div>
            <div style={modalFormGroup}><label style={modalLabel}>Expected Farrowing Date *</label>
                <input type="date" value={pregnancyRecord.expected_farrowing} onChange={(e) => setPregnancyRecord({...pregnancyRecord, expected_farrowing: e.target.value})} style={modalInput} required />
                <small style={{ color: '#888' }}>Typically 114 days after breeding</small></div>
            <div style={modalFormGroup}><label style={modalLabel}>Notes</label>
                <textarea value={pregnancyRecord.notes} onChange={(e) => setPregnancyRecord({...pregnancyRecord, notes: e.target.value})} style={{...modalInput, minHeight: '80px'}} /></div>
            <div style={modalButtonGroup}><button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                <button type="submit" style={{...modalSubmitButton, backgroundColor: '#4CAF50'}}>Confirm Pregnancy</button></div>
        </form>
    </div></div>
);

const FarrowingFormModal = ({ sows, farrowingRecord, setFarrowingRecord, onSubmit, onClose }) => {
    const pregnantSows = sows.filter(s => s.status === 'pregnant');
    
    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#2196F3', marginBottom: '20px' }}>🐖 Record Farrowing</h2>
                <form onSubmit={onSubmit}>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Select Sow *</label>
                        <select
                            value={farrowingRecord.sow_id}
                            onChange={(e) => setFarrowingRecord({...farrowingRecord, sow_id: parseInt(e.target.value)})}
                            style={modalInput}
                            required
                        >
                            <option value="">Select Pregnant Sow</option>
                            {pregnantSows.length > 0 ? (
                                pregnantSows.map(sow => (
                                    <option key={sow.id} value={sow.id}>
                                        {sow.tag_number} - {sow.name || 'Unnamed'} (Expected: {sow.expected_farrowing ? new Date(sow.expected_farrowing).toLocaleDateString() : 'Date not set'})
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled>No pregnant sows available</option>
                            )}
                        </select>
                        {pregnantSows.length === 0 && (
                            <p style={{ color: '#ff9800', fontSize: '12px', marginTop: '5px' }}>
                                ⚠️ No pregnant sows found. Mark a sow as pregnant first.
                            </p>
                        )}
                    </div>
                    
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Farrowing Date *</label>
                        <input
                            type="date"
                            value={farrowingRecord.farrowing_date}
                            onChange={(e) => setFarrowingRecord({...farrowingRecord, farrowing_date: e.target.value})}
                            style={modalInput}
                            required
                        />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={modalLabel}>Total Piglets Born *</label>
                            <input
                                type="number"
                                value={farrowingRecord.total_born}
                                onChange={(e) => setFarrowingRecord({...farrowingRecord, total_born: e.target.value})}
                                style={modalInput}
                                required
                                placeholder="e.g., 12"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={modalLabel}>Live Births *</label>
                            <input
                                type="number"
                                value={farrowingRecord.live_births}
                                onChange={(e) => setFarrowingRecord({...farrowingRecord, live_births: e.target.value})}
                                style={modalInput}
                                required
                                placeholder="e.g., 11"
                            />
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={modalLabel}>Stillbirths</label>
                            <input
                                type="number"
                                value={farrowingRecord.stillbirths}
                                onChange={(e) => setFarrowingRecord({...farrowingRecord, stillbirths: e.target.value})}
                                style={modalInput}
                                placeholder="0"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={modalLabel}>Weak Piglets</label>
                            <input
                                type="number"
                                value={farrowingRecord.weak_piglets}
                                onChange={(e) => setFarrowingRecord({...farrowingRecord, weak_piglets: e.target.value})}
                                style={modalInput}
                                placeholder="0"
                            />
                        </div>
                    </div>
                    
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Complications</label>
                        <input
                            type="text"
                            value={farrowingRecord.complications}
                            onChange={(e) => setFarrowingRecord({...farrowingRecord, complications: e.target.value})}
                            style={modalInput}
                            placeholder="Any complications during farrowing"
                        />
                    </div>
                    
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Notes</label>
                        <textarea
                            value={farrowingRecord.notes}
                            onChange={(e) => setFarrowingRecord({...farrowingRecord, notes: e.target.value})}
                            style={{...modalInput, minHeight: '80px'}}
                            placeholder="Additional observations..."
                        />
                    </div>
                    
                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                        <button 
                            type="submit" 
                            style={{...modalSubmitButton, backgroundColor: '#2196F3'}}
                            disabled={pregnantSows.length === 0}
                        >
                            Record Farrowing
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const WeaningFormModal = ({ sows, weaningRecord, setWeaningRecord, onSubmit, onClose }) => {
    const lactatingSows = sows.filter(s => s.status === 'lactating');
    
    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#9C27B0', marginBottom: '20px' }}>🍼 Record Weaning</h2>
                <form onSubmit={onSubmit}>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Select Sow *</label>
                        <select
                            value={weaningRecord.sow_id}
                            onChange={(e) => setWeaningRecord({...weaningRecord, sow_id: parseInt(e.target.value)})}
                            style={modalInput}
                            required
                        >
                            <option value="">Select Lactating Sow</option>
                            {lactatingSows.length > 0 ? (
                                lactatingSows.map(sow => (
                                    <option key={sow.id} value={sow.id}>
                                        {sow.tag_number} - {sow.name || 'Unnamed'} (Farrowed: {sow.last_farrowing ? new Date(sow.last_farrowing).toLocaleDateString() : 'Unknown'})
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled>No lactating sows available</option>
                            )}
                        </select>
                        {lactatingSows.length === 0 && (
                            <p style={{ color: '#ff9800', fontSize: '12px', marginTop: '5px' }}>
                                ⚠️ No lactating sows found. Record farrowing first.
                            </p>
                        )}
                    </div>
                    
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Weaning Date *</label>
                        <input
                            type="date"
                            value={weaningRecord.weaning_date}
                            onChange={(e) => setWeaningRecord({...weaningRecord, weaning_date: e.target.value})}
                            style={modalInput}
                            required
                        />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={modalLabel}>Piglets Weaned *</label>
                            <input
                                type="number"
                                value={weaningRecord.piglets_weaned}
                                onChange={(e) => setWeaningRecord({...weaningRecord, piglets_weaned: e.target.value})}
                                style={modalInput}
                                required
                                placeholder="Number of piglets"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={modalLabel}>Mortality During Nursing</label>
                            <input
                                type="number"
                                value={weaningRecord.mortality}
                                onChange={(e) => setWeaningRecord({...weaningRecord, mortality: e.target.value})}
                                style={modalInput}
                                placeholder="0"
                            />
                        </div>
                    </div>
                    
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Notes</label>
                        <textarea
                            value={weaningRecord.notes}
                            onChange={(e) => setWeaningRecord({...weaningRecord, notes: e.target.value})}
                            style={{...modalInput, minHeight: '80px'}}
                            placeholder="Additional notes..."
                        />
                    </div>
                    
                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                        <button 
                            type="submit" 
                            style={{...modalSubmitButton, backgroundColor: '#9C27B0'}}
                            disabled={lactatingSows.length === 0}
                        >
                            Record Weaning
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const HealthFormModal = ({ sows, healthRecord, setHealthRecord, onSubmit, onClose }) => (
    <div style={modalOverlayStyle}><div style={modalContentStyle}>
        <h2 style={{ color: '#f44336', marginBottom: '20px' }}>💉 Health Record</h2>
        <form onSubmit={onSubmit}>
            <div style={modalFormGroup}><label style={modalLabel}>Select Sow *</label>
                <select value={healthRecord.sow_id} onChange={(e) => setHealthRecord({...healthRecord, sow_id: parseInt(e.target.value)})} style={modalInput} required>
                    <option value="">Select Sow</option>
                    {sows.map(sow => (<option key={sow.id} value={sow.id}>{sow.tag_number} - {sow.name || 'Unnamed'}</option>))}
                </select>
            </div>
            <div style={modalFormGroup}><label style={modalLabel}>Record Date *</label>
                <input type="date" value={healthRecord.record_date} onChange={(e) => setHealthRecord({...healthRecord, record_date: e.target.value})} style={modalInput} required /></div>
            <div style={modalFormGroup}><label style={modalLabel}>Record Type *</label>
                <select value={healthRecord.record_type} onChange={(e) => setHealthRecord({...healthRecord, record_type: e.target.value})} style={modalInput} required>
                    <option value="vaccination">Vaccination</option><option value="deworming">Deworming</option>
                    <option value="treatment">Treatment</option><option value="checkup">Checkup</option>
                </select></div>
            <div style={modalFormGroup}><label style={modalLabel}>Diagnosis</label>
                <input type="text" value={healthRecord.diagnosis} onChange={(e) => setHealthRecord({...healthRecord, diagnosis: e.target.value})} style={modalInput} /></div>
            <div style={modalFormGroup}><label style={modalLabel}>Medication</label>
                <input type="text" value={healthRecord.medication} onChange={(e) => setHealthRecord({...healthRecord, medication: e.target.value})} style={modalInput} /></div>
            <div style={modalFormGroup}><label style={modalLabel}>Dosage</label>
                <input type="text" value={healthRecord.dosage} onChange={(e) => setHealthRecord({...healthRecord, dosage: e.target.value})} style={modalInput} /></div>
            <div style={modalFormGroup}><label style={modalLabel}>Administered By</label>
                <input type="text" value={healthRecord.administered_by} onChange={(e) => setHealthRecord({...healthRecord, administered_by: e.target.value})} style={modalInput} /></div>
            <div style={modalFormGroup}><label style={modalLabel}>Next Due Date</label>
                <input type="date" value={healthRecord.next_due} onChange={(e) => setHealthRecord({...healthRecord, next_due: e.target.value})} style={modalInput} /></div>
            <div style={modalFormGroup}><label style={modalLabel}>Notes</label>
                <textarea value={healthRecord.notes} onChange={(e) => setHealthRecord({...healthRecord, notes: e.target.value})} style={{...modalInput, minHeight: '80px'}} /></div>
            <div style={modalButtonGroup}><button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                <button type="submit" style={{...modalSubmitButton, backgroundColor: '#f44336'}}>Save Health Record</button></div>
        </form>
    </div></div>
);

const SowDetailsModal = ({ sow, onClose, getStatusBadge, onAction }) => (
    <div style={modalOverlayStyle}><div style={{...modalContentStyle, maxWidth: '800px'}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#ff1493', margin: 0 }}>{sow.tag_number} - {sow.name || 'Unnamed'}</h2>
            <button onClick={onClose} style={closeButtonStyle}>×</button>
        </div>
        <div style={{ marginBottom: '20px' }}>{getStatusBadge(sow.status)}</div>

        <div style={detailsSectionStyle}><h3 style={detailsSectionTitle}>Basic Information</h3>
            <div style={detailsGridStyle}>
                <DetailItem label="Breed" value={sow.breed_name} />
                <DetailItem label="Birth Date" value={sow.birth_date ? new Date(sow.birth_date).toLocaleDateString() : 'N/A'} />
                <DetailItem label="Age" value={sow.birth_date ? Math.floor((new Date() - new Date(sow.birth_date)) / (1000 * 60 * 60 * 24 * 365)) + ' years' : 'N/A'} />
                <DetailItem label="Source" value={sow.source} />
                {sow.source === 'purchased' && (<><DetailItem label="Purchase Date" value={sow.purchase_date ? new Date(sow.purchase_date).toLocaleDateString() : 'N/A'} /><DetailItem label="Purchase Price" value={sow.purchase_price ? `$${sow.purchase_price}` : 'N/A'} /></>)}
                <DetailItem label="ID Marks" value={sow.identification_marks || 'None'} />
            </div>
        </div>

        <div style={detailsSectionStyle}><h3 style={detailsSectionTitle}>Performance Statistics</h3>
            <div style={detailsGridStyle}>
                <DetailItem label="Parity (Litters)" value={sow.litter_count || 0} />
                <DetailItem label="Total Piglets" value={sow.total_piglets || 0} />
                <DetailItem label="Weaned Piglets" value={sow.weaned_piglets || 0} />
                <DetailItem label="Avg Litter Size" value={sow.average_litter_size || 0} />
                <DetailItem label="Survival Rate" value={sow.survival_rate ? sow.survival_rate + '%' : 'N/A'} />
            </div>
        </div>

        <div style={detailsSectionStyle}><h3 style={detailsSectionTitle}>Reproductive Status</h3>
            <div style={detailsGridStyle}>
                <DetailItem label="Current Status" value={sow.status} />
                {sow.last_heat && <DetailItem label="Last Heat" value={new Date(sow.last_heat).toLocaleDateString()} />}
                {sow.last_breeding && <DetailItem label="Last Breeding" value={new Date(sow.last_breeding).toLocaleDateString()} />}
                {sow.breeding_method && <DetailItem label="Method" value={sow.breeding_method} />}
                {sow.boar_id && <DetailItem label="Boar ID" value={sow.boar_id} />}
                {sow.last_farrowing && <DetailItem label="Last Farrowing" value={new Date(sow.last_farrowing).toLocaleDateString()} />}
                {sow.expected_farrowing && <DetailItem label="Expected Farrowing" value={new Date(sow.expected_farrowing).toLocaleDateString() + ` (${Math.ceil((new Date(sow.expected_farrowing) - new Date()) / (1000 * 60 * 60 * 24))} days)`} />}
                {sow.weaning_date && <DetailItem label="Weaning Date" value={new Date(sow.weaning_date).toLocaleDateString()} />}
            </div>
        </div>

        {sow.notes && <div style={detailsSectionStyle}><h3 style={detailsSectionTitle}>Notes</h3><p style={{ color: '#888', backgroundColor: '#000', padding: '10px', borderRadius: '8px' }}>{sow.notes}</p></div>}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
            <ActionButton icon="🔥" label="Record Heat" onClick={() => onAction('heat')} color="#ff9800" />
            <ActionButton icon="🤰" label="Record Breeding" onClick={() => onAction('breed')} color="#ff1493" />
            <ActionButton icon="✅" label="Confirm Pregnancy" onClick={() => onAction('pregnancy')} color="#4CAF50" />
            <ActionButton icon="🐖" label="Record Farrowing" onClick={() => onAction('farrow')} color="#2196F3" />
            <ActionButton icon="🍼" label="Record Weaning" onClick={() => onAction('wean')} color="#9C27B0" />
            <ActionButton icon="💉" label="Health Record" onClick={() => onAction('health')} color="#f44336" />
        </div>
    </div></div>
);

const DetailItem = ({ label, value }) => (<div><span style={{ color: '#888', fontSize: '0.9em' }}>{label}:</span><span style={{ color: '#fff', marginLeft: '8px', fontWeight: 'bold' }}>{value}</span></div>);
const ActionButton = ({ icon, label, onClick, color }) => (<button onClick={onClick} style={{ flex: 1, minWidth: '120px', padding: '10px', backgroundColor: color, color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><span>{icon}</span>{label}</button>);

// Styles
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' };
const modalContentStyle = { backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' };
const modalFormGroup = { marginBottom: '15px' };
const modalLabel = { color: '#ff1493', display: 'block', marginBottom: '5px', fontSize: '0.95em' };
const modalInput = { width: '100%', padding: '12px', backgroundColor: '#000', border: '2px solid #ff1493', borderRadius: '8px', color: '#fff', fontSize: '1em' };
const modalButtonGroup = { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' };
const modalCancelButton = { padding: '10px 20px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const modalSubmitButton = { padding: '10px 20px', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const closeButtonStyle = { background: 'none', border: 'none', color: '#888', fontSize: '2em', cursor: 'pointer' };
const detailsSectionStyle = { backgroundColor: '#000', borderRadius: '10px', padding: '15px', marginBottom: '15px' };
const detailsSectionTitle = { color: '#ff1493', fontSize: '1.1em', marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px' };
const detailsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' };

export default Sows;