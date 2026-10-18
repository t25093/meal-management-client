import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import MealsListPage from './pages/MealsListPage';
import NewMealPage from './pages/NewMealPage';
import MealDetailsPage from './pages/MealDetailsPage';
import UsersAdminPage from './pages/UsersAdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* כל המסכים שבתוך Layout דורשים התחברות */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/meals" element={<MealsListPage />} />
        <Route path="/meals/new" element={<NewMealPage />} />
        <Route path="/meals/:mealId" element={<MealDetailsPage />} />
        <Route path="/admin/users" element={<UsersAdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
