// Fungsi untuk mendapatkan tanggal hari ini dalam format YYYY-MM-DD dengan timezone Asia/Jakarta
export const getTodayIndonesia = () => {
  const now = new Date();
  const jakartaDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const year = jakartaDate.getFullYear();
  const month = String(jakartaDate.getMonth() + 1).padStart(2, '0');
  const day = String(jakartaDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Fungsi untuk memformat tanggal ke format Indonesia
export const formatDateIndonesia = (date: string | Date) => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta'
  };
  return new Date(date).toLocaleDateString('id-ID', options);
};

// Fungsi untuk memformat tanggal ke format Indonesia tanpa hari
export const formatDateIndonesiaShort = (date: string | Date) => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta'
  };
  return new Date(date).toLocaleDateString('id-ID', options);
};

// Fungsi untuk memformat tanggal dan waktu ke format Indonesia
export const formatDateTimeIndonesia = (date: string | Date) => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  };
  return new Date(date).toLocaleDateString('id-ID', options);
}; 