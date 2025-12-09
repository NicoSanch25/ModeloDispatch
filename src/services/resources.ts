import { supabase } from '../lib/supabase';
import { Staff, Ambulance, Location, Client, FuelRecord } from '../types';

// Mappers
const mapStaffFromDB = (data: any): Staff => ({
    id: data.id,
    name: data.name,
    role: data.role,
    phone: data.phone || '',
    isOutsourced: data.is_outsourced,
    companyName: data.company_name
});

const mapAmbulanceFromDB = (data: any): Ambulance => ({
    id: data.id,
    number: data.number,
    plate: data.plate,
    year: data.year,
    isOutsourced: data.is_outsourced,
    outsourcedCompanyName: data.outsourced_company_name,
    vehicleType: data.vehicle_type,
    coachBuilder: data.coach_builder,
    maintenance: {
        status: data.maintenance_status,
        mileage: data.mileage,
        mileageLastUpdate: data.mileage_last_update,
        vtvExpiration: data.vtv_expiration,
        insurance: data.insurance,
        mechanicNotes: data.mechanic_notes,
        tireType: data.tire_type,
        oilType: data.oil_type,
        batteryType: data.battery_type,
        batteryLastChange: data.battery_last_change,
        batteryPurchaseLocation: data.battery_purchase_location,
        workshopName: data.workshop_name,
        mechanicContact: data.mechanic_contact
    }
});

const mapLocationFromDB = (data: any): Location => ({
    id: data.id,
    name: data.name,
    address: data.address,
    googleMapsUrl: data.google_maps_url,
    contactName: data.contact_name,
    contactPhone: data.contact_phone
});

const mapClientFromDB = (data: any): Client => ({
    id: data.id,
    name: data.name,
    contactName: data.contact_name,
    contactPhone: data.contact_phone,
    email: data.email,
    notes: data.notes
});

const mapFuelFromDB = (data: any): FuelRecord => ({
    id: data.id,
    date: data.date,
    ambulanceId: data.ambulance_id,
    driverId: data.driver_id,
    fuelType: data.fuel_type,
    liters: Number(data.liters),
    items: data.items
});

export const resourceService = {
    // STAFF
    async getStaff() {
        const { data, error } = await supabase.from('staff').select('*');
        if (error) throw error;
        return data.map(mapStaffFromDB);
    },

    // AMBULANCES
    async getAmbulances() {
        const { data, error } = await supabase.from('ambulances').select('*');
        if (error) throw error;
        return data.map(mapAmbulanceFromDB);
    },

    // LOCATIONS
    async getLocations() {
        const { data, error } = await supabase.from('locations').select('*');
        if (error) throw error;
        return data.map(mapLocationFromDB);
    },

    async createLocation(name: string) {
        const { data, error } = await supabase.from('locations').insert({ name }).select('*');
        if (error) throw error;
        return data.map(mapLocationFromDB)[0];
    },

    // CLIENTS
    async getClients() {
        const { data, error } = await supabase.from('clients').select('*');
        if (error) throw error;
        return data.map(mapClientFromDB);
    },

    // FUEL
    async getFuelRecords() {
        const { data, error } = await supabase.from('fuel_records').select('*');
        if (error) throw error;
        return data.map(mapFuelFromDB);
    },

    // SAVE METHODS
    async saveStaff(staff: Partial<Staff>) {
        const payload: any = {
            name: staff.name,
            role: staff.role,
            phone: staff.phone,
            is_outsourced: staff.isOutsourced,
            company_name: staff.companyName
        };
        if (staff.id) {
            const { error } = await supabase.from('staff').update(payload).eq('id', staff.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('staff').insert(payload);
            if (error) throw error;
        }
    },

    async saveAmbulance(ambulance: Partial<Ambulance>) {
        const payload: any = {
            number: ambulance.number,
            plate: ambulance.plate,
            year: ambulance.year,
            vehicle_type: ambulance.vehicleType,
            coach_builder: ambulance.coachBuilder,
            is_outsourced: ambulance.isOutsourced,
            outsourced_company_name: ambulance.outsourcedCompanyName,
            maintenance_status: ambulance.maintenance?.status,
            mileage: ambulance.maintenance?.mileage,
            vtv_expiration: ambulance.maintenance?.vtvExpiration,
            insurance: ambulance.maintenance?.insurance,
            mechanic_notes: ambulance.maintenance?.mechanicNotes,
            tire_type: ambulance.maintenance?.tireType,
            oil_type: ambulance.maintenance?.oilType,
            battery_type: ambulance.maintenance?.batteryType,
            battery_last_change: ambulance.maintenance?.batteryLastChange,
            battery_purchase_location: ambulance.maintenance?.batteryPurchaseLocation,
            workshop_name: ambulance.maintenance?.workshopName,
            mechanic_contact: ambulance.maintenance?.mechanicContact
        };

        if (ambulance.id) {
            const { error } = await supabase.from('ambulances').update(payload).eq('id', ambulance.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('ambulances').insert(payload);
            if (error) throw error;
        }
    },

    async saveLocation(location: Partial<Location>) {
        const payload = {
            name: location.name,
            address: location.address,
            google_maps_url: location.googleMapsUrl,
            contact_name: location.contactName,
            contact_phone: location.contactPhone
        };
        if (location.id) {
            const { error } = await supabase.from('locations').update(payload).eq('id', location.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('locations').insert(payload);
            if (error) throw error;
        }
    },

    async saveClient(client: Partial<Client>) {
        const payload = {
            name: client.name,
            email: client.email,
            contact_name: client.contactName,
            contact_phone: client.contactPhone,
            notes: client.notes
        };
        if (client.id) {
            const { error } = await supabase.from('clients').update(payload).eq('id', client.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('clients').insert(payload);
            if (error) throw error;
        }
    }
};
