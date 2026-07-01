// دالة مساعدة لتوليد معرفات فريدة عشوائية (UUIDv4) مطابقة للمواصفات القياسية لقواعد البيانات
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
