'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useClassDetails } from '@/hooks/useClassDetails';
import Avatar from '@/components/Avatar';
import { format, formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Hash, Eye, MessageSquare, X } from 'lucide-react';

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  return <ClassDetailContent classId={id} />;
}

function ClassDetailContent({ classId }: { classId: string }) {
  const router = useRouter();
  const { classData, members, rooms, loading, error, removeMember, addMember } = useClassDetails(classId);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'child' | 'guardian' | 'adult'>('child');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Channel view state
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [roomMessages, setRoomMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const handleCopyInviteCode = async () => {
    if (classData?.invite_code) {
      try {
        await navigator.clipboard.writeText(classData.invite_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleRemove = async (userId: string, userName: string) => {
    if (removeConfirm !== userId) {
      setRemoveConfirm(userId);
      return;
    }

    setRemoving(true);
    const result = await removeMember(userId);
    setRemoving(false);
    setRemoveConfirm(null);

    if (!result.success) {
      alert(`Fejl ved fjernelse af medlem: ${result.error}`);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      setAddError('Email er påkrævet');
      return;
    }

    setAdding(true);
    setAddError(null);
    const result = await addMember(
      newMemberEmail, 
      newMemberRole,
      newMemberName.trim() || undefined
    );
    setAdding(false);

    if (result.success) {
      setShowAddModal(false);
      setNewMemberEmail('');
      setNewMemberName('');
      setNewMemberRole('child');
      setAddError(null);
    } else {
      setAddError(result.error || 'Kunne ikke tilføje medlem');
    }
  };

  // Load messages for a room in stealth mode
  const handleViewRoom = async (room: any) => {
    setSelectedRoom(room);
    setLoadingMessages(true);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles (
            display_name,
            avatar_url,
            avatar_color
          )
        `)
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Reverse to show oldest first
      setRoomMessages((data || []).reverse());
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'child': return 'Elev';
      case 'guardian': return 'Forælder';
      case 'adult': return 'Lærer';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'child': return 'badge-info';
      case 'guardian': return 'badge-secondary';
      case 'adult': return 'badge-primary';
      default: return 'badge-ghost';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-ball loading-lg text-primary"></span>
          <p className="text-base-content/60 font-medium">Indlæser klassedetaljer...</p>
        </div>
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <p className="text-error font-medium">Fejl ved indlæsning af klasse</p>
          <p className="text-base-content/60 text-sm">{error}</p>
          <button onClick={() => router.back()} className="btn btn-ghost">
            Gå tilbage
          </button>
        </div>
      </div>
    );
  }

  const students = members.filter(m => m.role_in_class === 'child');
  const teachers = members.filter(m => m.role_in_class === 'adult');
  const parents = members.filter(m => m.role_in_class === 'guardian');
  
  // Count placeholders (only among students)
  const placeholderCount = students.filter(m => m.is_placeholder).length;
  const activeStudents = students.filter(m => !m.is_placeholder);
  
  // Get only non-placeholder students and standalone teachers (not guardians nested under students)
  const displayMembers = members.filter(m => 
    (m.role_in_class === 'child' && !m.is_placeholder) || m.role_in_class === 'adult'
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="btn btn-ghost btn-square"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-6 h-6 stroke-current" strokeWidth={2}>
            <path strokeLinecap="square" strokeLinejoin="miter" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-black uppercase tracking-tight text-base-content">
            {classData.label}
          </h1>
          <div className="h-1 w-24 bg-primary mt-2"></div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
        >
          <svg className="w-6 h-6 stroke-current" strokeWidth={2} fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" d="M12 4v16m8-8H4"/>
          </svg>
          Tilføj Medlem
        </button>
      </div>

      {/* Class Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-2">
            Klassetrin
          </div>
          <div className="text-2xl font-black text-primary">
            {classData.grade_level}. klasse
          </div>
        </div>

        <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-2">
            Invite Kode
          </div>
          <div className="flex items-center gap-2">
            <code className="text-2xl font-mono uppercase tracking-wider text-secondary">
              {classData.invite_code}
            </code>
            <div className={`tooltip ${copied ? 'tooltip-open tooltip-success' : ''}`} data-tip={copied ? 'Kopieret!' : 'Kopier kode'}>
              <button
                onClick={handleCopyInviteCode}
                className="btn btn-ghost btn-square btn-sm"
              >
                <svg className="w-5 h-5 stroke-current" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-2">
            Skole
          </div>
          <div className="text-sm font-medium text-base-content">
            {classData.school_name || 'Ingen skole'}
          </div>
        </div>

        <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-2">
            Oprettet
          </div>
          <div className="text-sm font-medium text-base-content">
            {format(new Date(classData.created_at), 'd. MMM yyyy', { locale: da })}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats stats-vertical lg:stats-horizontal shadow-lg w-full bg-base-100 border-2 border-base-content/10">
        <div className="stat">
          <div className="stat-title text-xs font-bold uppercase tracking-widest text-base-content/50">
            Elever
          </div>
          <div className="stat-value text-info">{activeStudents.length}</div>
          {placeholderCount > 0 && (
            <div className="stat-desc text-xs font-mono uppercase tracking-wider text-base-content/40 mt-1">
              + {placeholderCount} tomme pladser
            </div>
          )}
        </div>
        
        <div className="stat">
          <div className="stat-title text-xs font-bold uppercase tracking-widest text-base-content/50">
            Lærere
          </div>
          <div className="stat-value text-primary">{teachers.length}</div>
        </div>
        
        <div className="stat">
          <div className="stat-title text-xs font-bold uppercase tracking-widest text-base-content/50">
            Forældre
          </div>
          <div className="stat-value text-secondary">{parents.length}</div>
        </div>
        
        <div className="stat">
          <div className="stat-title text-xs font-bold uppercase tracking-widest text-base-content/50">
            Rum
          </div>
          <div className="stat-value text-accent">{rooms.length}</div>
        </div>
      </div>

      {/* Channels Section */}
      <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
        <div className="p-6 border-b-2 border-base-content/10">
          <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
            Kanaler
          </h2>
        </div>

        <div className="p-6 space-y-2">
          {rooms.length === 0 ? (
            <div className="p-12 text-center">
              <Hash className="w-16 h-16 stroke-current text-base-content/30 mx-auto mb-4" strokeWidth={2} />
              <h2 className="text-2xl font-black uppercase tracking-tight text-base-content mb-2">
                Ingen kanaler
              </h2>
              <p className="text-base-content/60">Denne klasse har ingen chatrum endnu</p>
            </div>
          ) : (
            rooms.map((room: any) => (
              <button
                key={room.id}
                onClick={() => handleViewRoom(room)}
                className="w-full text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Hash className="w-5 h-5 stroke-current text-primary" strokeWidth={2} />
                    <div>
                      <div className="text-sm font-bold text-base-content">
                        {room.name}
                      </div>
                      {room.description && (
                        <div className="text-xs text-base-content/60">
                          {room.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 stroke-current text-base-content/40" strokeWidth={2} />
                    <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">
                      Se beskeder
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Members Section */}
      <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
        <div className="p-6 border-b-2 border-base-content/10 flex items-center justify-between">
          <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
            Klassen
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
          >
            <svg className="w-5 h-5 stroke-current" strokeWidth={2} fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" d="M12 4v16m8-8H4" />
            </svg>
            Tilføj Medlem
          </button>
        </div>

        <div className="p-6 space-y-2">
          {displayMembers.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 stroke-current text-base-content/30 mx-auto mb-4" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <h2 className="text-2xl font-black uppercase tracking-tight text-base-content mb-2">
                Ingen medlemmer
              </h2>
              <p className="text-base-content/60">Tilføj medlemmer til denne klasse</p>
            </div>
          ) : (
            displayMembers.map((member) => {
              // If student with guardians, make it expandable
              if (member.role_in_class === 'child' && member.guardians && member.guardians.length > 0) {
                return (
                  <div key={member.user_id} className="collapse collapse-arrow bg-base-100 border-2 border-base-content/10">
                    <input type="checkbox" />
                    <div className="collapse-title">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar
                            user={{
                              display_name: member.display_name,
                              avatar_url: member.avatar_url,
                              avatar_color: member.avatar_color,
                            }}
                            size="sm"
                          />
                          <div>
                            <div className="font-bold text-base-content">
                              {member.display_name}
                            </div>
                            <div className="text-xs text-base-content/60">
                              {member.role_in_class === 'child' ? (member.username || member.email) : member.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`badge ${getRoleBadgeColor(member.role_in_class)} badge-sm font-bold uppercase`}>
                            {getRoleLabel(member.role_in_class)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove(member.user_id, member.display_name);
                            }}
                            disabled={removing}
                            className={`btn btn-xs ${
                              removeConfirm === member.user_id
                                ? 'btn-error'
                                : 'btn-ghost'
                            }`}
                          >
                            {removeConfirm === member.user_id ? 'Bekræft?' : 'Fjern'}
                          </button>
                          {removeConfirm === member.user_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRemoveConfirm(null);
                              }}
                              className="btn btn-xs btn-ghost"
                            >
                              Annuller
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="collapse-content">
                      <div className="pl-8 space-y-2 mt-2">
                        <div className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-2">
                          Forældre
                        </div>
                        {member.guardians.map((guardian) => (
                          <div key={guardian.user_id} className="flex items-center justify-between bg-base-200 p-3 border-2 border-base-content/10">
                            <div className="flex items-center gap-3">
                              <Avatar
                                user={{
                                  display_name: guardian.display_name,
                                  avatar_url: guardian.avatar_url,
                                  avatar_color: guardian.avatar_color,
                                }}
                                size="sm"
                              />
                              <div>
                                <div className="font-medium text-base-content">
                                  {guardian.display_name}
                                </div>
                                <div className="text-xs text-base-content/60">
                                  {guardian.role_in_class === 'child' ? (guardian.username || guardian.email) : guardian.email}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`badge ${getRoleBadgeColor(guardian.role_in_class)} badge-sm font-bold uppercase`}>
                                {getRoleLabel(guardian.role_in_class)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemove(guardian.user_id, guardian.display_name);
                                }}
                                disabled={removing}
                                className={`btn btn-xs ${
                                  removeConfirm === guardian.user_id
                                    ? 'btn-error'
                                    : 'btn-ghost'
                                }`}
                              >
                                {removeConfirm === guardian.user_id ? 'Bekræft?' : 'Fjern'}
                              </button>
                              {removeConfirm === guardian.user_id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRemoveConfirm(null);
                                  }}
                                  className="btn btn-xs btn-ghost"
                                >
                                  Annuller
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Student without guardians or teacher
              return (
                <div key={member.user_id} className="flex items-center justify-between bg-base-100 border-2 border-base-content/10 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      user={{
                        display_name: member.display_name,
                        avatar_url: member.avatar_url,
                        avatar_color: member.avatar_color,
                      }}
                      size="sm"
                    />
                    <div>
                      <div className="font-bold text-base-content">
                        {member.display_name}
                      </div>
                      <div className="text-xs text-base-content/60">
                        {member.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${getRoleBadgeColor(member.role_in_class)} badge-sm font-bold uppercase`}>
                      {getRoleLabel(member.role_in_class)}
                    </span>
                    <button
                      onClick={() => handleRemove(member.user_id, member.display_name)}
                      disabled={removing}
                      className={`btn btn-xs ${
                        removeConfirm === member.user_id
                          ? 'btn-error'
                          : 'btn-ghost'
                      }`}
                    >
                      {removeConfirm === member.user_id ? 'Bekræft?' : 'Fjern'}
                    </button>
                    {removeConfirm === member.user_id && (
                      <button
                        onClick={() => setRemoveConfirm(null)}
                        className="btn btn-xs btn-ghost"
                      >
                        Annuller
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl bg-base-100 border-2 border-base-content/10">
            <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-6">
              Tilføj Medlem
            </h3>
            
            <div className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-2 block">
                  Email
                </label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="bruger@eksempel.dk"
                  className="input input-md w-full border-2 border-primary/30 bg-base-200 focus:border-primary focus:bg-base-100"
                />
              </div>

              {/* Name Field */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-2 block">
                  Navn
                </label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Fulde navn"
                  className="input input-md w-full border-2 border-secondary/30 bg-base-200 focus:border-secondary focus:bg-base-100"
                />
              </div>

              {/* Role Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-base-content/50 mb-2 block">
                  Rolle i Klasse
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as 'child' | 'guardian' | 'adult')}
                  className="select select-md w-full border-2 border-accent/50 font-bold focus:border-accent"
                >
                  <option value="child">Elev</option>
                  <option value="guardian">Forælder</option>
                  <option value="adult">Lærer</option>
                </select>
              </div>

              {addError && (
                <div className="alert alert-error border-2 border-error/20">
                  <svg className="w-6 h-6 stroke-current" strokeWidth={2} fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm">{addError}</span>
                </div>
              )}
            </div>

            <div className="modal-action">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewMemberEmail('');
                  setNewMemberName('');
                  setNewMemberRole('child');
                  setAddError(null);
                }}
                className="btn btn-ghost"
                disabled={adding}
              >
                Annuller
              </button>
              <button
                onClick={handleAddMember}
                className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content"
                disabled={adding}
              >
                {adding ? (
                  <>
                    <span className="loading loading-ball loading-xs"></span>
                    Tilføjer...
                  </>
                ) : (
                  'Tilføj'
                )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-base-content/50" onClick={() => setShowAddModal(false)}></div>
        </div>
      )}

      {/* Room Messages Modal (Stealth Mode) */}
      {selectedRoom && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl h-[80vh] max-h-[800px] bg-base-100 border-2 border-base-content/10 flex flex-col p-0">
            {/* Modal Header */}
            <div className="p-6 border-b-2 border-base-content/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Hash className="w-6 h-6 stroke-current text-primary" strokeWidth={2} />
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-base-content">
                    {selectedRoom.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Eye className="w-4 h-4 stroke-current text-warning" strokeWidth={2} />
                    <span className="text-xs font-bold uppercase tracking-wider text-warning">
                      Stealth Mode
                    </span>
                    <span className="text-xs text-base-content/60">
                      · Kun læsning
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedRoom(null);
                  setRoomMessages([]);
                }}
                className="btn btn-ghost btn-square btn-sm"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <span className="loading loading-ball loading-lg text-primary"></span>
                </div>
              ) : roomMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-16 h-16 stroke-current text-base-content/30 mb-4" strokeWidth={2} />
                  <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-2">
                    Ingen beskeder
                  </h3>
                  <p className="text-base-content/60">
                    Der er ingen beskeder i denne kanal endnu
                  </p>
                </div>
              ) : (
                roomMessages.map((message) => (
                  <div
                    key={message.id}
                    className="bg-base-200 border-2 border-base-content/10 p-4"
                  >
                    {/* Message Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="avatar">
                        <div className="w-8 h-8 rounded-full">
                          {message.profiles?.avatar_url ? (
                            <img
                              src={message.profiles.avatar_url}
                              alt={message.profiles.display_name}
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center font-bold text-xs text-white"
                              style={{
                                backgroundColor: message.profiles?.avatar_color || '#10B981',
                              }}
                            >
                              {message.profiles?.display_name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-base-content">
                            {message.profiles?.display_name || 'Ukendt bruger'}
                          </span>
                          <span className="text-xs text-base-content/40">
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: true,
                              locale: da,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="ml-11">
                      {message.image_url && (
                        <img
                          src={message.image_url}
                          alt="Uploaded image"
                          className="max-w-md mb-2 border-2 border-base-content/10"
                        />
                      )}
                      {message.body && (
                        <p className="text-sm text-base-content whitespace-pre-wrap">
                          {message.body}
                        </p>
                      )}
                      {message.edited_at && (
                        <span className="text-xs text-base-content/40 mt-1 block">
                          (redigeret)
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t-2 border-base-content/10 bg-base-200/50 shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-xs text-base-content/60">
                  {roomMessages.length > 0 ? (
                    <>Viser de seneste {roomMessages.length} beskeder</>
                  ) : (
                    <>Ingen beskeder at vise</>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedRoom(null);
                    setRoomMessages([]);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Luk
                </button>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop bg-base-content/50"
            onClick={() => {
              setSelectedRoom(null);
              setRoomMessages([]);
            }}
          ></div>
        </div>
      )}
      </div>
  );
}
