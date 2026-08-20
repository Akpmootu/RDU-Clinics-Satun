// @vitest-environment jsdom
import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { INITIAL_CLINICS } from '../data/initialData';
import { calculateSummaries } from '../services/api';
import { DistrictDetailModal } from './DistrictDetailModal';

const cityClinics = INITIAL_CLINICS
  .filter((clinic) => clinic.district === 'เมือง')
  .map((clinic) => clinic.id === 'STN-M-006'
    ? { ...clinic, assessmentStatus: 'ยังไม่ประเมิน' as const }
    : clinic);
const citySummary = calculateSummaries(cityClinics).districtSummaries.find(
  (summary) => summary.district === 'เมือง',
);

if (!citySummary) throw new Error('City summary fixture is required');

interface HarnessProps {
  onClose?: () => void;
}

const Harness: React.FC<HarnessProps> = ({ onClose = () => undefined }) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <DistrictDetailModal
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        onClose();
      }}
      summary={citySummary}
      clinics={cityClinics}
      onSelectClinicToEdit={() => undefined}
    />
  );
};

describe('DistrictDetailModal', () => {
  it('uses the canonical Clinic schema and searches by licensee', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByText('นพ.อารี วงศ์ตระกูล')).toBeInTheDocument();
    expect(screen.getAllByText(/อัปเดตล่าสุด:/).length).toBeGreaterThan(0);

    await user.type(
      screen.getByRole('searchbox', { name: 'ค้นหาคลินิก' }),
      'วงศ์ตระกูล',
    );

    expect(screen.getByText('พบ 1 จาก 7 รายการ')).toBeInTheDocument();
    expect(screen.getByText('หมออารี คลินิกเด็กและครอบครัว')).toBeInTheDocument();
    expect(screen.queryByText('คลินิกแพทย์สมชาย เวชกรรม')).not.toBeInTheDocument();
  });

  it('treats every unassessed status as pending', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'รอประเมิน 2' }));

    expect(screen.getByText('พบ 2 จาก 7 รายการ')).toBeInTheDocument();
    expect(screen.getByText('คลินิกอบอุ่น พยาบาลและการผดุงครรภ์')).toBeInTheDocument();
    expect(screen.getByText('คลินิกการแพทย์แผนไทยอันดามัน')).toBeInTheDocument();
  });

  it('traps keyboard focus and restores it to the trigger after Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const trigger = document.createElement('button');
    trigger.textContent = 'เปิดรายละเอียดอำเภอ';
    document.body.appendChild(trigger);
    trigger.focus();

    render(<Harness onClose={onClose} />);

    expect(screen.getByRole('button', { name: 'ปิดหน้าต่างรายละเอียดอำเภอ' })).toHaveFocus();
    expect(document.body).toHaveStyle({ overflow: 'hidden' });

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'ปิดหน้าต่าง' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'ปิดหน้าต่างรายละเอียดอำเภอ' })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
    expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
    trigger.remove();
  });
});
