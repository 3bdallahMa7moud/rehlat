import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { 
  ShieldCheck, 
  KeyRound, 
  UserX, 
  UserCheck, 
  Trash2, 
  AlertTriangle, 
  Check, 
  Lock, 
  Users, 
  RefreshCw 
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { 
    currentUser, 
    participants, 
    adminResetPin, 
    adminToggleUserStatus, 
    adminClearData 
  } = useApp();

  const [selectedUserForPin, setSelectedUserForPin] = useState<string | null>(null);
  const [newPinInput, setNewPinInput] = useState('');
  const [clearScopeModal, setClearScopeModal] = useState<'DAY' | 'WEEK' | 'MONTH' | null>(null);

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center glass-card rounded-3xl border border-rose-500/30 max-w-md mx-auto my-12">
        <Lock className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-900 dark:text-white">صلاحيات غير كافية</h4>
        <p className="text-xs text-slate-500 mt-1">هذه اللوحة مخصصة فقط للمشرف الإداري على مشروع رحلة التغيير.</p>
      </div>
    );
  }

  const handleResetPinSubmit = (userId: string) => {
    if (newPinInput.length >= 4) {
      adminResetPin(userId, newPinInput);
      setSelectedUserForPin(null);
      setNewPinInput('');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* الترويسة وتوضيح الصلاحيات */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-900/10 via-slate-900/5 to-teal-900/10 border border-purple-500/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>لوحة الإشراف وإدارة المنظومة</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-600 text-white font-bold">
                Admin Console
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              <strong>صلاحيات المشرف:</strong> إدارة حسابات المشاركين، تعيين الـ PIN وتفعيله فورياً، والأرشفة الآمنة دون فقدان السجلات.
            </p>
          </div>
        </div>
      </div>

      {/* إدارة المشاركين والـ PIN الفوري */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-500" />
            <span>إدارة المشاركين والتحكم السريع ({participants.length})</span>
          </h4>
          <span className="text-xs text-slate-400">تحديث فوري دون الحاجة لـ Refresh</span>
        </div>

        <div className="space-y-3">
          {participants.map(user => (
            <div
              key={user.id}
              className={`p-4 rounded-2xl glass-card border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                !user.isActive ? 'opacity-50 bg-slate-100 dark:bg-slate-900/40' : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-11 h-11 rounded-full object-cover border-2 border-teal-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {user.displayName}
                    </h5>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300">
                      {user.rankTitle}
                    </span>
                    {!user.isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500">
                        معطل مؤقتاً (مؤرشف)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {user.jobTitle} • الـ PIN الحالي: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{user.pin}</span> • آخر ظهور: {user.lastSeenAt}
                  </p>
                </div>
              </div>

              {/* أزرار الإدارة الخاصة بكل مستخدم */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* زر إعادة تعيين الـ PIN */}
                <button
                  onClick={() => setSelectedUserForPin(user.id)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition btn-press"
                  title="تغيير الـ PIN وتفعيله فورياً"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>تغيير PIN</span>
                </button>

                {/* زر الأرشفة / التعطيل المؤقت (Soft Delete) */}
                <button
                  onClick={() => adminToggleUserStatus(user.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition btn-press ${
                    user.isActive
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  }`}
                  title="أرشفة مع الاحتفاظ بكامل السجلات"
                >
                  {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  <span>{user.isActive ? 'أرشفة مؤقتة' : 'استعادة المشارك'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* خيارات المسح الآمن والمحدد استجابة لطلب العميل الصريح */}
      <div className="p-5 sm:p-6 rounded-3xl border border-rose-500/30 bg-rose-500/5 space-y-4">
        <div>
          <h4 className="text-base font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            <span>خيارات المسح المحددة والآمنة (بدل المسح العام العشوائي)</span>
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            يجب أن يكون المسح مخصصاً وبنافذة تأكيد صريحة لحماية البيانات التاريخية والـ Streaks.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setClearScopeModal('DAY')}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-2 transition btn-press"
          >
            <span>مسح مهام اليوم الحالي فقط</span>
          </button>

          <button
            onClick={() => setClearScopeModal('WEEK')}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-2 transition btn-press"
          >
            <span>إعادة ضبط الأسبوع الحالي</span>
          </button>
        </div>
      </div>

      {/* نافذة تغيير الـ PIN التفاعلية */}
      {selectedUserForPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="max-w-sm w-full glass-card border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-500" />
              <span>إعادة تعيين الـ PIN وتفعيله فوراً</span>
            </h4>
            <p className="text-xs text-slate-500">
              أدخل الرقم السري الجديد المكون من 4 أرقام على الأقل:
            </p>
            <input
              type="text"
              maxLength={6}
              value={newPinInput}
              onChange={e => setNewPinInput(e.target.value)}
              placeholder="مثال: 5678"
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-center text-lg tracking-widest text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedUserForPin(null)}
                className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleResetPinSubmit(selectedUserForPin)}
                disabled={newPinInput.length < 4}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition btn-press disabled:opacity-50"
              >
                تفعيل الـ PIN الجديد فوراً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد المسح المحدد */}
      {clearScopeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="max-w-sm w-full glass-card border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-900 dark:text-white">تأكيد عملية المسح</h4>
              <p className="text-xs text-slate-500">
                هل أنت متأكد من مسح مهام {clearScopeModal === 'DAY' ? 'اليوم الحالي' : 'الأسبوع الحالي'}؟
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setClearScopeModal(null)}
                className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                تراجع
              </button>
              <button
                onClick={() => {
                  adminClearData(clearScopeModal);
                  setClearScopeModal(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition btn-press"
              >
                تأكيد المسح بأمان
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
