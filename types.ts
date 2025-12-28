
export interface Patient {
    id: string;
    name: string;
    avatarUrl?: string;
    initials: string;
    age: number;
    gender: 'Male' | 'Female';
    currentWeight: number;
    initialWeight?: number;
    weightChange: number;
    bmi: number;
    bmiCategory: string;
    targetWeight?: number;
}

export interface UpcomingDose {
    patientId: string;
    treatment: string;
    dosage: string;
    time: string;
    status: 'Aguardando' | 'Agendado';
}

export interface Injection {
    id?: string;
    date: string;
    day: string;
    dosage: string;
    notes: string;
    status: 'Aplicada' | 'Pulada';
    doseValue?: number;        // Valor cobrado em R$
    isHistorical?: boolean;    // Se foi inserida retroativamente
    applicationDate: string;   // Data real da aplicação (YYYY-MM-DD)
    isPaid: boolean;           // Se o valor desta dose foi pago
    patient_id: string;        // ID do paciente (UUID)
    patientWeightAtInjection?: number; // Peso registrado no momento da aplicação
}

export interface MedicationStep {
    id?: string;
    dosage: string;
    status: 'Concluído' | 'Atual' | 'Bloqueado' | 'Pulada';
    details: string;
    progress?: number;
    current_week?: number;
    total_weeks?: number;
    is_skipped?: boolean;
    recordedWeight?: number; // Peso histórico para exibição na jornada
    date?: string; // Data da aplicação (exibição na jornada)
}

export interface FinancialRecord {
    id: number;
    patient: {
        id: string;
        name: string;
        avatarUrl?: string;
        initials: string;
    };
    date: string;
    description: string;
    value: number;
    status: 'Pago' | 'Pendente' | 'Atrasado';
}

export interface Appointment {
    id: string;
    patientId: string;
    date: Date;
    description: string;
}

export interface Medication {
    id: string;
    name: string;
    supplier: string;
    stock: number;
    costPrice: number; // Price per vial
    salePrice: number; // Price per dose
    dosesPerVial: number;
    dosesRendered: number; // Doses used from current stock
}

export type UserRole = 'Admin' | 'Staff' | 'Patient';
export type UserStatus = 'Active' | 'Pending' | 'Inactive';

export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    initials: string;
    role: UserRole;
    status: UserStatus;
}

export interface Profile {
    role: UserRole;
    description: string;
    icon: string;
}


export const mockPatients: Patient[] = [
    { id: '#4829', name: 'Ana Silva', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCELtzS7Q_HpWwCJpSNiQseAdqpmCW8aeR6XVZO2OS3-MlsO2l7alnX0G8UdWHZIOjOZdfIlTmzsjvMwjYnQWNKaGVIS_vHq2nowFBGUgQQ4m9n31hoXvogjrpr3B7erK1WuAmfr9VndqlFpDhYzkhpTP8tAN10yt9yowvI5HwfzxDEK1r94Bo28jolaxMG4y8bYn0snTL2E_0V43IsIaDVXjbsL4KRaTCEQwptxBT52w7QEUqF6kxT_uZu5UiJW79lbRif8JCgiT8', initials: 'AS', age: 34, gender: 'Female', currentWeight: 82, weightChange: -1.2, bmi: 28.4, bmiCategory: 'Overweight' },
    { id: '#9201', name: 'Carlos Souza', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBt1POJqYaZJS5z5xltJJx9fQRrxXCUTH5AjvZOrzxjXJxTjdZBo5JJqYc8qxMtVwN61OtnNm0VjDIrCUDMfxSbUy6ntGILxhWI3qd8-m-dGFX_yzE7rhxU2JSDkSCU3WI5D5c-BhZLDaETwkg4sMC4Aw8as7jLTLgcKCfQDShdNqLjJlwNlS-VemGJzy3O7sT-xEwNUlqe3YcLxIbzNo2DQp95XuQODyWn8YkkZM-EKeA2xX9ZvZliG62Z3PkdF6MEE4UehL2tpnw', initials: 'CS', age: 45, gender: 'Male', currentWeight: 95, weightChange: -0.5, bmi: 31.2, bmiCategory: 'Obese' },
    { id: '#1033', name: 'Mariana Costa', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAnGUtMZMU_WUYu9hH2iugvXmnVNlaaRuCbzdln8sqjGAoCyjElYI81i7OjpUbxF2Lp-HIvzhLud3FPBmXtvDoj17xQFiuKfhaElWg-z8DOyizbGiJ3lJn00RRVB8zKijSlsyOq2Py0gkf1s5dHrYuweal8FYt6actashmGj4rmhocJCQg9zmpubUNqRfCEbu5Z1EyUbFdJGFwiGkP9ffOsqmcqtcyPPRgkyrDa8FL6FUIZKmWMEafUGp6zxdlcc_nlKlNQUNF4_gw', initials: 'MC', age: 28, gender: 'Female', currentWeight: 68, weightChange: -2.1, bmi: 24.1, bmiCategory: 'Normal' },
    { id: '#5521', name: 'Roberto Lima', initials: 'RL', age: 52, gender: 'Male', currentWeight: 88, weightChange: 0, bmi: 29.0, bmiCategory: 'Overweight' },
];

export const mockUpcomingDoses: UpcomingDose[] = [
    { patientId: '#4829', treatment: 'Tirzepatida', dosage: '2.5mg Subcutânea', time: '09:00', status: 'Aguardando' },
    { patientId: '#9201', treatment: 'Tirzepatida', dosage: '5.0mg Subcutânea', time: '09:30', status: 'Agendado' },
    { patientId: '#1033', treatment: 'Tirzepatida', dosage: '10.0mg Subcutânea', time: '10:15', status: 'Agendado' },
    { patientId: '#5521', treatment: 'Tirzepatida', dosage: '7.5mg Subcutânea', time: '11:00', status: 'Agendado' },
];

export const anaSilvaInjections: Injection[] = [
    { date: '12 Fev, 2024', day: 'Quarta-feira', dosage: '5.0 mg', notes: 'Aplicação de rotina', status: 'Aplicada', applicationDate: '2024-02-12', isPaid: true, patient_id: '#4829' },
    { date: '05 Fev, 2024', day: 'Quarta-feira', dosage: '5.0 mg', notes: '-', status: 'Aplicada', applicationDate: '2024-02-05', isPaid: true, patient_id: '#4829' },
    { date: '29 Jan, 2024', day: 'Quarta-feira', dosage: '2.5 mg', notes: 'Paciente relatou náusea', status: 'Pulada', applicationDate: '2024-01-29', isPaid: false, patient_id: '#4829' },
    { date: '22 Jan, 2024', day: 'Quarta-feira', dosage: '2.5 mg', notes: '-', status: 'Aplicada', applicationDate: '2024-01-22', isPaid: true, patient_id: '#4829' },
];

export const anaSilvaMedicationPath: MedicationStep[] = [
    { dosage: '2.5 mg', status: 'Concluído', details: 'Concluído • 10 Jan - 06 Fev' },
    { dosage: '5.0 mg (Atual)', status: 'Atual', details: 'Semana 3 de 4', progress: 75 },
    { dosage: '7.5 mg', status: 'Bloqueado', details: 'Bloqueado • Requer revisão' },
    { dosage: '10.0 mg', status: 'Bloqueado', details: 'Bloqueado' },
];

export const mockFinancialData: FinancialRecord[] = [
    { id: 1, patient: { id: '#4829', name: 'Ana Silva', initials: 'AS' }, date: '12/10/2023', description: 'Consulta de Rotina', value: 250.00, status: 'Pago' },
    { id: 2, patient: { id: '#9201', name: 'Carlos Souza', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfLGiinBDCyw5NKBNp15DCZ9-Z_wB8JUzXR77LflRC4rdlNMwqwrKmQmB6oV75ut2WNJ_SlrUvHilMHcD6GlA5yYF9-6AvoVN1tmVXTzQTBqfSKSPODJ8QP1WnamXgjaPAFzXgrHRSD6UzN86JkyRKJGmwGwF-bXpgPGNNOhMXbUS23Yho8LVL2wipR3wHLFkDET6vFheOetGiw8EMwxgU4dwR27v19Qjh4VZ9omMT4MccmX9xfYHWHf-idXE3RspyMYoJJU8vb2I', initials: 'CS' }, date: '14/10/2023', description: 'Ressonância Magnética', value: 800.00, status: 'Pendente' },
    { id: 3, patient: { id: '#1034', name: 'Beatriz Lima', initials: 'BL' }, date: '15/10/2023', description: 'Exame de Sangue', value: 150.00, status: 'Atrasado' },
    { id: 4, patient: { id: '#1035', name: 'João Mendes', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDg7fy5qGs6dVmvFPEDsPaZ0QNIKaoOEUum6RSTFj1mmEvzcJkjl_qgfe8YKKb22kpbZ1kKomG6SIwV8Gf11V-W0soaLybYCWqo0SNq-w-6IVsl4noHcANTzq-_26Pl86q6amd2ISBF0ZTX9IZ9H1A9FIAkFD6UNLt7186EZrXsRo6tSOsJ2k8pUpf7_70R1rmDEKPWkUqyE-t1In9F4noU5Db8ABu8b0Xe2RlbgNNz7uhLwjH3kcRqzn6zLkaYmEXXrGw26i9Ss8M', initials: 'JM' }, date: '16/10/2023', description: 'Retorno', value: 120.00, status: 'Pendente' },
    { id: 5, patient: { id: '#1033', name: 'Mariana Costa', initials: 'MC' }, date: '18/10/2023', description: 'Raio-X', value: 300.00, status: 'Pago' },
    { id: 6, patient: { id: '#4829', name: 'Ana Silva', initials: 'AS' }, date: '19/10/2023', description: 'Medicação', value: 75.50, status: 'Pago' },
    { id: 7, patient: { id: '#1035', name: 'João Mendes', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDg7fy5qGs6dVmvFPEDsPaZ0QNIKaoOEUum6RSTFj1mmEvzcJkjl_qgfe8YKKb22kpbZ1kKomG6SIwV8Gf11V-W0soaLybYCWqo0SNq-w-6IVsl4noHcANTzq-_26Pl86q6amd2ISBF0ZTX9IZ9H1A9FIAkFD6UNLt7186EZrXsRo6tSOsJ2k8pUpf7_70R1rmDEKPWkUqyE-t1In9F4noU5Db8ABu8b0Xe2RlbgNNz7uhLwjH3kcRqzn6zLkaYmEXXrGw26i9Ss8M', initials: 'JM' }, date: '20/10/2023', description: 'Fisioterapia', value: 180.00, status: 'Pendente' },
];

const today = new Date();
export const mockAppointments: Appointment[] = [
    { id: '1', patientId: '#4829', date: new Date(today.getFullYear(), today.getMonth(), 15, 9, 0), description: 'Aplicação de Dose' },
    { id: '2', patientId: '#9201', date: new Date(today.getFullYear(), today.getMonth(), 15, 9, 30), description: 'Acompanhamento' },
    { id: '3', patientId: '#1033', date: new Date(today.getFullYear(), today.getMonth(), 18, 14, 0), description: 'Consulta Inicial' },
    { id: '4', patientId: '#5521', date: new Date(today.getFullYear(), today.getMonth(), 18, 10, 0), description: 'Aplicação de Dose' },
    { id: '5', patientId: '#4829', date: new Date(today.getFullYear(), today.getMonth(), 22, 9, 0), description: 'Aplicação de Dose' },
    { id: '6', patientId: '#1033', date: new Date(today.getFullYear(), today.getMonth(), 25, 14, 0), description: 'Acompanhamento' },
    { id: '7', patientId: '#9201', date: new Date(today.getFullYear(), today.getMonth(), 29, 9, 30), description: 'Aplicação de Dose' },
];

export const mockMedications: Medication[] = [
    { id: 'TIRZ-001', name: 'Tirzepatida 2.5mg', supplier: 'Pharma Inc.', stock: 15, costPrice: 450.00, salePrice: 120.00, dosesPerVial: 4, dosesRendered: 38 },
    { id: 'TIRZ-002', name: 'Tirzepatida 5.0mg', supplier: 'Pharma Inc.', stock: 8, costPrice: 600.00, salePrice: 180.00, dosesPerVial: 4, dosesRendered: 25 },
    { id: 'SEMA-001', name: 'Semaglutida 1.0mg', supplier: 'Health Co.', stock: 22, costPrice: 380.00, salePrice: 100.00, dosesPerVial: 4, dosesRendered: 60 },
    { id: 'LIRA-001', name: 'Liraglutida 0.6mg', supplier: 'BioMed', stock: 5, costPrice: 320.00, salePrice: 85.00, dosesPerVial: 5, dosesRendered: 21 },
];

export const mockUsers: User[] = [
    { id: 'usr-001', name: 'Dr. Silva', email: 'dr.silva@medislim.com', role: 'Admin', status: 'Active', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC3NXmUohveOo6a47pxNaYAR57Lnr7R8pgrljSfdtnJoS7_tfCHPbMvf5-ax1OVU2l5jHdepws4E704Do88J__MBDMlYngmPscz4AIfx9P9EI3Nzs3pY2RLTenIsug3vSQsRSX5OwbrFBmfmKLu058WPyoYtm8ca2E4H6IvHxdx6JUSGUQeTWm2qk_tgrYKlhhk70N4DmYD7CskAtuwNlvweGbM2OCOZvs9WN7bV6w5SEbKtf8h3Gj572RkOKSvGdt_c_oPFSpCwYY', initials: 'DS' },
    { id: 'usr-002', name: 'Enfermeira Oliveira', email: 'e.oliveira@medislim.com', role: 'Staff', status: 'Active', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-gZETxRRm9wP85oXGCHZp9gVj-Cj4cQGpbG3Gg_XvM4gZjwL3k6Nmsy-vku2T_2V-3C7k3bF-C4Zl9Q2A3b8eI3Gj7c6pS9eGz5H_k3X2Z7b8Nn9pGk4Jz', initials: 'EO' },
    { id: 'usr-003', name: 'Ana Silva', email: 'ana.silva@email.com', role: 'Patient', status: 'Active', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCELtzS7Q_HpWwCJpSNiQseAdqpmCW8aeR6XVZO2OS3-MlsO2l7alnX0G8UdWHZIOjOZdfIlTmzsjvMwjYnQWNKaGVIS_vHq2nowFBGUgQQ4m9n31hoXvogjrpr3B7erK1WuAmfr9VndqlFpDhYzkhpTP8tAN10yt9yowvI5HwfzxDEK1r94Bo28jolaxMG4y8bYn0snTL2E_0V43IsIaDVXjbsL4KRaTCEQwptxBT52w7QEUqF6kxT_uZu5UiJW79lbRif8JCgiT8', initials: 'AS' },
    { id: 'usr-004', name: 'Jorge Martins', email: 'jorge.m@email.com', role: 'Patient', status: 'Pending', initials: 'JM' },
    { id: 'usr-005', name: 'Ricardo Nunes', email: 'ricardo.n@medislim.com', role: 'Staff', status: 'Inactive', initials: 'RN' },
];

export const mockProfiles: Profile[] = [
    { role: 'Admin', description: 'Acesso total a todas as funcionalidades, incluindo configurações de sistema e gerenciamento de usuários.', icon: 'shield_person' },
    { role: 'Staff', description: 'Acesso para gerenciar pacientes, agendamentos e registros de medicação. Não pode alterar configurações.', icon: 'medical_services' },
    { role: 'Patient', description: 'Acesso limitado para visualizar seu próprio tratamento, calendário de doses e histórico financeiro.', icon: 'person' },
];
