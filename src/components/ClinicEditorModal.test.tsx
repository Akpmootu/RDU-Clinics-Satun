// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClinicEditorModal } from './ClinicEditorModal';

const baseProps = {
  isOpen: true,
  mode: 'create' as const,
  clinic: null,
  onClose: vi.fn(),
};

describe('ClinicEditorModal', () => {
  it('submits the confirmed ClinicRegistry and assessment fields', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ClinicEditorModal {...baseProps} onSave={onSave} />);

    await user.type(screen.getByLabelText('ชื่อสถานพยาบาล'), 'คลินิกทดสอบสตูล');
    await user.selectOptions(screen.getByLabelText('อำเภอ'), 'ละงู');
    await user.clear(screen.getByLabelText('ประเภทคลินิก'));
    await user.type(screen.getByLabelText('ประเภทคลินิก'), 'คลินิกเวชกรรม');
    await user.type(screen.getByLabelText('ผู้รับอนุญาต'), 'นายทดสอบ ระบบดี');
    await user.type(screen.getByLabelText('โทรศัพท์'), '074123456');
    await user.selectOptions(screen.getByLabelText('สถานะประเมิน'), 'ประเมินแล้ว');
    await user.selectOptions(screen.getByLabelText('ระดับผลประเมิน'), '3');
    await user.type(screen.getByLabelText('วันที่ประเมิน'), '2026-08-21');
    await user.click(screen.getByRole('button', { name: 'เพิ่มคลินิก' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'คลินิกทดสอบสตูล',
      district: 'ละงู',
      licensee: 'นายทดสอบ ระบบดี',
      phone: '074123456',
      fiscalYear: 2569,
      assessmentStatus: 'ประเมินแล้ว',
      assessmentLevel: 3,
      passCriteria: 'ผ่าน',
      assessmentDate: '2026-08-21',
    }));
  });

  it('restores focus to the trigger after Escape', async () => {
    const user = userEvent.setup();
    const trigger = document.createElement('button');
    trigger.textContent = 'เปิด editor';
    document.body.appendChild(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const { rerender } = render(<ClinicEditorModal {...baseProps} onClose={onClose} onSave={vi.fn()} />);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    rerender(<ClinicEditorModal {...baseProps} isOpen={false} onClose={onClose} onSave={vi.fn()} />);
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('keeps the assessment fiscal year immutable while editing', () => {
    render(
      <ClinicEditorModal
        {...baseProps}
        mode="edit"
        clinic={{
          id: 'STN-TEST-1', no: 1, district: 'เมือง', name: 'คลินิกเดิม', type: 'คลินิกเวชกรรม',
          licensee: 'นายทดสอบ', fiscalYear: 2569, assessmentStatus: 'ประเมินแล้ว', assessmentLevel: 2,
          passCriteria: 'ผ่าน', remarks: '', updatedAt: '2026-08-20T00:00:00.000Z',
        }}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('ปีงบประมาณ')).toBeDisabled();
  });
});
