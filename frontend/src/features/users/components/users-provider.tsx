import React, { useState } from 'react'
import type { User } from '../data/users-api'

type UsersDialogState =
  | null
  | { type: 'add' }
  | { type: 'edit' | 'delete'; user: User }

type UsersContextType = {
  dialog: UsersDialogState
  setDialog: React.Dispatch<React.SetStateAction<UsersDialogState>>
}

const UsersContext = React.createContext<UsersContextType | null>(null)

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<UsersDialogState>(null)

  return <UsersContext value={{ dialog, setDialog }}>{children}</UsersContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useUsers = () => {
  const usersContext = React.useContext(UsersContext)

  if (!usersContext) {
    throw new Error('useUsers has to be used within <UsersContext>')
  }

  return usersContext
}
