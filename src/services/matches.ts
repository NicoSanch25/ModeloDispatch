import { supabase } from '../lib/supabase';
import { Match, MatchType } from '../types';
import { getConflicts, checkSystemConflicts } from '../utils/scheduling';

// --- MAPPERS ---
const mapMatchFromDB = (data: any): Match => {
    let type = data.type;
    let location = data.location;
    
    // Decode custom type if it was packed into location
    if (type === 'Evento' && location && location.startsWith('[')) {
        const match = location.match(/^\[(.*?)\] (.*)$/);
        if (match) {
            type = match[1];
            location = match[2];
        }
    }

    return {
        id: data.id,
        date: data.date,
        time: data.time?.substring(0, 5), // Remove seconds if present
        location: location,
        fieldNumber: data.field_number,
        type: type,
    durationMinutes: data.duration_minutes,
    extensionMinutes: data.extension_minutes,
    chukkers: data.chukkers,
    status: data.status,
    suspensionReason: data.suspension_reason,
    isSingleCrew: data.is_single_crew,
    driverNotified: data.driver_notified,
    nurseNotified: data.nurse_notified,

    clientId: data.client_id,
    ambulanceId: data.ambulance_id,
    driverId: data.driver_id,
    nurseId: data.nurse_id,
    thirdCrewId: data.third_crew_id,

    hiredBy: data.hired_by,
    hiredContact: data.hired_contact,

    incidentReport: (data.has_incident || data.incident_details) ? {
        hasIncident: data.has_incident,
        wasTransferred: data.was_transferred,
        details: data.incident_details
    } : undefined,

    auditLog: data.audit_logs?.map((log: any) => ({
        date: log.date,
        changes: log.changes
    }))
    };
};

// --- HELPERS ---
export const timeUtils = {
    timeToMinutes(timeStr?: string) {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    },

    minutesToTime(totalMinutes: number) {
        const h = Math.floor(totalMinutes / 60) % 24;
        const m = totalMinutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    },

    calculateEndTime(timeStr: string, durationMin: number, extensionMin: number = 0) {
        const start = this.timeToMinutes(timeStr);
        const end = start + durationMin + extensionMin;
        return this.minutesToTime(end);
    }
};

export const matchHelpers = {
    getConflicts,
    checkSystemConflicts,

    getStaffHistory(staffId: string, matches: Match[]) {
        return matches.filter(m =>
            (m.driverId === staffId || m.nurseId === staffId || m.thirdCrewId === staffId) &&
            m.status !== 'Suspended'
        ).sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date); // Descending date
            return b.time.localeCompare(a.time);
        });
    },

    getAmbulanceHistory(ambulanceId: string, matches: Match[]) {
        return matches.filter(m =>
            m.ambulanceId === ambulanceId &&
            m.status !== 'Suspended'
        ).sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return b.time.localeCompare(a.time);
        });
    }
};

export const matchesService = {
    async getMatches() {
        const { data, error } = await supabase
            .from('matches')
            .select('*, audit_logs(*)')
            .order('date', { ascending: true });

        if (error) throw error;
        return data.map(mapMatchFromDB);
    },

    async saveMatch(matchData: Partial<Match>) {
        const isPolo = matchData.type?.includes('Polo');
        const finalData = {
            ...matchData,
            chukkers: isPolo ? matchData.chukkers : null
        };

        let dbType = finalData.type;
        let dbLocation = finalData.location;
        const validTypes = ['Partido de Polo', 'Práctica de Polo', 'Triangular de Polo', 'Partido de Fútbol', 'Evento'];
        
        if (dbType && !validTypes.includes(dbType)) {
            // Encode custom type into the location field to bypass Supabase ENUM constraint
            dbLocation = `[${dbType}] ${dbLocation}`;
            dbType = 'Evento';
        }

        const payload: any = {
            date: finalData.date,
            time: finalData.time,
            location: dbLocation,
            field_number: finalData.fieldNumber,
            type: dbType,
            duration_minutes: finalData.durationMinutes,
            extension_minutes: finalData.extensionMinutes,
            chukkers: finalData.chukkers,
            status: finalData.status,
            suspension_reason: finalData.suspensionReason,
            is_single_crew: finalData.isSingleCrew,
            driver_notified: finalData.driverNotified,
            nurse_notified: finalData.nurseNotified,
            client_id: finalData.clientId === undefined ? undefined : finalData.clientId || null,
            ambulance_id: finalData.ambulanceId === undefined ? undefined : finalData.ambulanceId || null,
            driver_id: finalData.driverId === undefined ? undefined : finalData.driverId || null,
            nurse_id: finalData.nurseId === undefined ? undefined : finalData.nurseId || null,
            third_crew_id: finalData.thirdCrewId === undefined ? undefined : finalData.thirdCrewId || null,
            hired_by: finalData.hiredBy,
            hired_contact: finalData.hiredContact,
            has_incident: finalData.incidentReport?.hasIncident,
            was_transferred: finalData.incidentReport?.wasTransferred,
            incident_details: finalData.incidentReport?.details
        };

        if (matchData.type === undefined) delete payload.chukkers;
        for (const key of Object.keys(payload)) {
            if (payload[key] === undefined) delete payload[key];
        }
        if (!matchData.id) {
            payload.driver_notified ??= false;
            payload.nurse_notified ??= false;
            payload.has_incident ??= false;
            payload.was_transferred ??= false;
            payload.incident_details ??= '';
        }

        if (matchData.id) {
            // Update
            const { error } = await supabase.from('matches').update(payload).eq('id', matchData.id).select('id').single();
            if (error) throw error;
            return { id: matchData.id, ...finalData }; // Return optimistic
        } else {
            // Insert
            const { data, error } = await supabase.from('matches').insert(payload).select();
            if (error) throw error;
            return data ? mapMatchFromDB(data[0]) : null;
        }
    },

    async deleteMatch(id: string) {
        const { error } = await supabase.from('matches').delete().eq('id', id);
        if (error) throw error;
    },

    async setNotified(matchId: string, flags: { driver_notified?: boolean; nurse_notified?: boolean }) {
        const { error } = await supabase.from('matches').update(flags).eq('id', matchId).select('id').single();
        if (error) throw error;
    },

    async addAuditLog(matchId: string, changes: string) {
        const { error } = await supabase.from('audit_logs').insert({
            match_id: matchId,
            changes
        });
        if (error) throw error;
    }
};
