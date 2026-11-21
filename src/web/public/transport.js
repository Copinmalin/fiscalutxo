export async function request(path, data, download = false) {
  const response = await fetch('/api/' + path, data === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  })
  if (!response.ok) {
    const result = await response.json()
    throw new Error([result.error, ...(result.issues ?? [])].join(' · '))
  }
  return download ? response.blob() : response.json()
}
