import { render, screen } from '@testing-library/react';
import App from './App';
import {
  getStaffMembers,
  loginStaff,
  logoutStaff,
  setStaffMemberStatus,
} from './Admin/adminManagementStore';

test('renders the Cafétcha home page', () => {
  render(<App />);
  expect(screen.getAllByRole('heading', { name: 'Cafétcha' })[0]).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Order Now!' })).toBeInTheDocument();
});

test('staff status action blocks and restores login without a password', () => {
  const marcel = getStaffMembers().find(
    (member) => member.email === 'marcel.grachzelli.t.santos@cafetcha.com',
  );
  const credentials = {
    email: 'marcel.grachzelli.t.santos@cafetcha.com',
    password: 'marcel123',
  };

  try {
    expect(marcel).toBeTruthy();
    expect(setStaffMemberStatus(marcel.id, 'Inactive')).toMatchObject({ ok: true });
    expect(loginStaff(credentials)).toMatchObject({
      ok: false,
      error: 'This staff account is disabled.',
    });

    expect(setStaffMemberStatus(marcel.id, 'Active')).toMatchObject({ ok: true });
    expect(loginStaff(credentials)).toMatchObject({ ok: true });
  } finally {
    setStaffMemberStatus(marcel.id, 'Active');
    logoutStaff();
  }
});
