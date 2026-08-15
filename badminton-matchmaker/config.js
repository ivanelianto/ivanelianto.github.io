export const COURT_FEE = 15000;
export const SHUTTLE_FEE_PER = 4000;

export function buildCollectPaymentMessage({ greeting, playerName, scheduleDateISO, totalPayment }) {
  return `${greeting} ${playerName},
  
Yang main hari ${scheduleDateISO} kemarin,

Totalnya *Rp${Number(totalPayment).toLocaleString('id-ID')}* 🙏

Pembayaran bisa melalui transfer bank ke:
BCA
5271595931
a/n Ivan Favian Elianto`;
}
