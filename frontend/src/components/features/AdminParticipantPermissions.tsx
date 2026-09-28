"use client";

import { useState } from "react";
import { Button, Card, SectionHeader } from "@/components/ui";
import { useDemo } from "@/state/DemoContext";
import type { Participant } from "@/types/models";

export function AdminParticipantPermissions({ participant }: { participant: Participant }) {
  const { setParticipantRole, pushToast } = useDemo();
  const [isAdmin, setIsAdmin] = useState(participant.role === "admin");

  const changed = isAdmin !== (participant.role === "admin");

  return <Card>
    <SectionHeader title="الصلاحيات" description="حدد إمكانية دخول المشارك إلى صفحات الإدارة." />
    <div className="permission-list">
      <label><input type="checkbox" checked={isAdmin} onChange={(event) => setIsAdmin(event.target.checked)} /> صلاحية مشرف</label>
    </div>
    <Button size="sm" variant="secondary" disabled={!changed} onClick={() => {
      setParticipantRole(participant.id, isAdmin ? "admin" : "participant");
      pushToast({ tone: "success", title: "تم حفظ الصلاحية", body: `تحدّث دور ${participant.name} بنجاح.` });
    }}>حفظ الصلاحية</Button>
  </Card>;
}
