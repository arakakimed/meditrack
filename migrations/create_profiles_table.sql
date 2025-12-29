-- Create a table for user profiles
create table if not exists profiles (
  id uuid primary key,
  name text not null,
  email text,
  role text not null check (role in ('Admin', 'Staff', 'Patient')),
  status text not null check (status in ('Active', 'Pending', 'Inactive')),
  initials text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;

-- Create policies (allowing public access for this demo/dashboard context, adjust for production)
create policy "Enable read access for all users" on profiles for select using (true);
create policy "Enable insert for all users" on profiles for insert with check (true);
create policy "Enable update for all users" on profiles for update using (true);
create policy "Enable delete for all users" on profiles for delete using (true);

-- Insert some default/seed data
insert into profiles (id, name, email, role, status, initials) values
  ('d0b3c2a1-1234-5678-90ab-cdef12345678', 'Dr. Silva', 'dr.silva@medislim.com', 'Admin', 'Active', 'DS'),
  ('d0b3c2a1-8765-4321-90ab-cdef87654321', 'Enfermeira Oliveira', 'e.oliveira@medislim.com', 'Staff', 'Active', 'EO');
