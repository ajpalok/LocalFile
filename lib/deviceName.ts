// Generate random device names
const adjectives = [
  'Swift', 'Brave', 'Clever', 'Mighty', 'Gentle', 'Noble', 'Wise', 'Bold',
  'Bright', 'Quick', 'Silent', 'Strong', 'Fierce', 'Calm', 'Wild', 'Free',
  'Happy', 'Lucky', 'Proud', 'Sharp', 'Cool', 'Smart', 'Fast', 'Agile'
];

const nouns = [
  'Falcon', 'Tiger', 'Dragon', 'Phoenix', 'Wolf', 'Eagle', 'Lion', 'Bear',
  'Hawk', 'Panda', 'Fox', 'Owl', 'Shark', 'Whale', 'Dolphin', 'Raven',
  'Lynx', 'Jaguar', 'Panther', 'Leopard', 'Cheetah', 'Cobra', 'Viper', 'Python'
];

export function generateRandomDeviceName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);
  
  return `${adjective}${noun}${number}`;
}

export function getDeviceName(): string {
  // Check if we have a stored device name in localStorage
  if (typeof window !== 'undefined') {
    let deviceName = localStorage.getItem('deviceName');
    
    if (!deviceName) {
      deviceName = generateRandomDeviceName();
      localStorage.setItem('deviceName', deviceName);
    }
    
    return deviceName;
  }
  
  return generateRandomDeviceName();
}
