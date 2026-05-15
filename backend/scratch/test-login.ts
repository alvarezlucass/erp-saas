import axios from 'axios'

async function testLogin() {
  try {
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'alvarezlucass@hotmail.com',
      password: 'Unifai2026!'
    })
    console.log('✅ Login successful:', response.data)
  } catch (error: any) {
    console.error('❌ Login failed:', error.response?.status, error.response?.data)
  }
}

testLogin()
