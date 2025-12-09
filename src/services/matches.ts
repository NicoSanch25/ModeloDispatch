import { supabase } from '../lib/supabase';
import { Match, MatchType } from '../types';

// --- MAPPERS ---
const mapMatchFromDB = (data: any): Match => ({
    id: data.id,
    date: data.date,
    time: data.time?.substring(0, 5), // Remove seconds if present
    location: data.location,
    fieldNumber: data.field_number,
    type: data.type,
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
});

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

interface ConflictDetail {
    match: Match;
    resources: string[];
}

export const matchHelpers = {
    getConflicts(currentMatch: Match, allMatches: Match[]) {
        if (currentMatch.status === 'Suspended') return { hard: [], shared: [] };

        const currentStart = timeUtils.timeToMinutes(currentMatch.time);
        const currentEnd = currentStart + (currentMatch.durationMinutes || 90) + (currentMatch.extensionMinutes || 0) + 15;

        const hard: ConflictDetail[] = [];
        const shared: ConflictDetail[] = [];

        const loc1 = (currentMatch.location || '').trim().toLowerCase();
        const field1 = (currentMatch.fieldNumber || '').trim().toLowerCase();

        allMatches.forEach(other => {
            if (other.id === currentMatch.id || other.date !== currentMatch.date) return;
            if (other.status === 'Suspended') return;

            const otherStart = timeUtils.timeToMinutes(other.time);
            const otherEnd = otherStart + (other.durationMinutes || 90) + (other.extensionMinutes || 0) + 15;

            if (!(currentStart < otherEnd && currentEnd > otherStart)) return;

            const conflictingResources: string[] = [];
            if (currentMatch.driverId && currentMatch.driverId === other.driverId) conflictingResources.push("Chofer");
            if (currentMatch.nurseId && currentMatch.nurseId === other.nurseId) conflictingResources.push("Enfermero/a");
            if (currentMatch.thirdCrewId && currentMatch.thirdCrewId === other.thirdCrewId) conflictingResources.push("Auxiliar");
            if (currentMatch.ambulanceId && currentMatch.ambulanceId === other.ambulanceId) conflictingResources.push("Móvil");

            if (conflictingResources.length > 0) {
                const loc2 = (other.location || '').trim().toLowerCase();
                const field2 = (other.fieldNumber || '').trim().toLowerCase();

                if (loc1 === loc2) {
                    if (field1 && field2 && field1 !== field2) {
                        shared.push({ match: other, resources: conflictingResources });
                        return;
                    }
                }
                hard.push({ match: other, resources: conflictingResources });
            }
        });

        return { hard, shared };
    },

    checkSystemConflicts(matches: Match[]) {
        const todayStr = new Date().toISOString().split('T')[0];
        const relevantMatches = matches.filter(m => m.date >= todayStr && m.status !== 'Suspended');
        let count = 0;
        for (const match of relevantMatches) {
            if (this.getConflicts(match, matches).hard.length > 0) count++;
        }
        return count;
    },

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

        const payload: any = {
            date: finalData.date,
            time: finalData.time,
            location: finalData.location,
            field_number: finalData.fieldNumber,
            type: finalData.type,
            duration_minutes: finalData.durationMinutes,
            extension_minutes: finalData.extensionMinutes,
            chukkers: finalData.chukkers,
            status: finalData.status,
            suspension_reason: finalData.suspensionReason,
            is_single_crew: finalData.isSingleCrew,
            driver_notified: finalData.driverNotified || false,
            nurse_notified: finalData.nurseNotified || false,
            client_id: finalData.clientId || null,
            ambulance_id: finalData.ambulanceId || null,
            driver_id: finalData.driverId || null,
            nurse_id: finalData.nurseId || null,
            third_crew_id: finalData.thirdCrewId || null,
            hired_by: finalData.hiredBy,
            hired_contact: finalData.hiredContact,
            has_incident: finalData.incidentReport?.hasIncident || false,
            was_transferred: finalData.incidentReport?.wasTransferred || false,
            incident_details: finalData.incidentReport?.details || ''
        };

        if (matchData.id) {
            // Update
            const { error } = await supabase.from('matches').update(payload).eq('id', matchData.id);
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

    async addAuditLog(matchId: string, changes: string) {
        await supabase.from('audit_logs').insert({
            match_id: matchId,
            changes
        });
    }
};
