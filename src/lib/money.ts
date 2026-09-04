export type Minor = number & {readonly __brand :"Minor"};


/** 5.50 EGP  ->  550 piastres */
export function toMinor(egp: number): Minor {
  return Math.round(egp * 100) as Minor;
}

/** 550 piastres  ->  5.50 EGP */
export function fromMinor(m: Minor): number {
  return m / 100;
}

/** 231907  ->  "EGP 2,319.07"  - for display only */
export function formatEGP(m: Minor): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
  }).format(fromMinor(m));
}

/** Setting rows are stored as strings. "11368" -> 11368 */
export function settingToMinor(value: string): Minor {
  return Number.parseInt(value, 10) as Minor;
}


//function to calculate the total amount
export function sumMinor(amounts :Minor[]):Minor{
    let total=0;

    for(const amount of amounts){
        total = total + amount;
    }

    return total as Minor;
}



//the function to calculate the deposit
export function applypercent(amount : Minor , percent : number):Minor{
    return Math.round((amount*percent)/100)as Minor;
}