import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ServerWakeNotice from './components/ServerWakeNotice';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import MealsListPage from './pages/MealsListPage';
import NewMealPage from './pages/NewMealPage';
import MealDetailsPage from './pages/MealDetailsPage';
import UsersAdminPage from './pages/UsersAdminPage';
import ProfilePage from './pages/ProfilePage';
import UserDetailsPage from './pages/UserDetailsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

export default function App() {
  return (
    <>
      <ServerWakeNotice />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {/* כל המסכים שבתוך Layout דורשים התחברות */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/meals" element={<MealsListPage />} />
          <Route path="/meals/new" element={<NewMealPage />} />
          <Route path="/meals/:mealId" element={<MealDetailsPage />} />
          <Route path="/admin/users" element={<UsersAdminPage />} />
          <Route path="/admin/users/:userId" element={<UserDetailsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
