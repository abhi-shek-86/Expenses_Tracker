import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  Timestamp,
  orderBy,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Select elements
const authSection = document.getElementById('auth-section');
const dashboard = document.getElementById('dashboard');
const authBtn = document.getElementById('auth-btn');
const switchMode = document.getElementById('switch-mode');
const authTitle = document.getElementById('auth-title');
const toggleAuth = document.getElementById('toggle-auth');

let isLogin = true;

// Toggle between login and signup
switchMode.addEventListener('click', () => {
  isLogin = !isLogin;
  authTitle.textContent = isLogin ? 'Login' : 'Sign Up';
  authBtn.innerHTML = isLogin 
    ? '<i class="fas fa-sign-in-alt"></i> Login'
    : '<i class="fas fa-user-plus"></i> Sign Up';

  // Show or hide the monthly income field based on the mode
  document.getElementById('monthly-income').style.display = isLogin ? 'none' : 'block';
});

// Authentication
authBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const monthlyIncomeInput = document.getElementById('monthly-income');
  const monthlyIncome = monthlyIncomeInput ? parseFloat(monthlyIncomeInput.value) : null;

  // Validate inputs
  if (!email || !password || (!isLogin && isNaN(monthlyIncome))) {
    alert("Please fill in all required fields.");
    return;
  }

  try {
    if (isLogin) {
      // Login logic
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      // Signup logic
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        monthlyIncome: monthlyIncome
      });

      alert("Signup successful! You are now logged in.");
    }
  } catch (error) {
    alert(error.message);
  }
});

// Logout Function
window.logout = function() {
  signOut(auth);
};

// Handle Auth State Changes
onAuthStateChanged(auth, async (user) => {
  const landingSection = document.getElementById('landing-section');
  const authSection = document.getElementById('auth-section');
  const dashboard = document.getElementById('dashboard');

  if (user) {
    // User is logged in
    landingSection.style.display = 'none';
    authSection.style.display = 'none';
    dashboard.style.display = 'block';

    // Fetch and display monthly income
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      document.getElementById('total-income').textContent = formatCurrency(userData.monthlyIncome || 0);
    }

    loadExpenses();  // Load expenses on user login
    updateDashboardDate(); // Set the current month and year
    updateSummaryData(); // Update the summary cards and chart
  } else {
    // User is not logged in
    landingSection.style.display = 'none'; // Hide landing page
    authSection.style.display = 'block'; // Show login/signup section
    dashboard.style.display = 'none'; // Hide dashboard
  }
});

// Update Dashboard Date
function updateDashboardDate() {
  const now = new Date();
  const month = now.toLocaleString('default', { month: 'long' }).toUpperCase();
  const year = now.getFullYear();
  document.querySelector('.logout-container h2').textContent = `${month} ${year}`;
}

// Add Expense Function
window.addExpense = async function () {
  const descInput = document.getElementById('desc');
  const amountInput = document.getElementById('amount');
  const categoryInput = document.getElementById('category');

  const desc = descInput.value;
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;
  const user = auth.currentUser;

  if (!user) return;

  if (!desc || isNaN(amount) || !category) {
    alert("Please fill in all fields.");
    return;
  }

  try {
    const docRef = await addDoc(collection(db, 'expenses'), {
      uid: user.uid,
      desc,
      amount,
      category,
      date: Timestamp.now()
    });

    console.log("Expense added with ID: ", docRef.id);

    // Clear the input fields after successful addition
    descInput.value = '';
    amountInput.value = '';
    categoryInput.value = '';

    loadExpenses(); // Refresh the expense list after adding
    updateSummaryData(); // Update the summary data
  } catch (error) {
    console.error("Error adding expense: ", error.message, error.code);
    alert("Failed to add expense. Please try again.");
  }
};

// Format currency function
function formatCurrency(amount) {
  return '₹' + amount.toLocaleString('en-IN');
}

// Format date function
function formatDate(timestamp) {
  const date = timestamp.toDate();
  return date.toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

// Load Expenses Function
async function loadExpenses(month = null) {
  const expenseList = document.getElementById('expense-list');
  expenseList.innerHTML = '';  // Clear the list before loading new data
  const totalAmountElem = document.getElementById('total-amount');
  
  const user = auth.currentUser;
  if (!user) return;

  try {
    let q = query(
      collection(db, 'expenses'), 
      where('uid', '==', user.uid),
      orderBy('date', 'desc') // Latest first
    );

    const snapshot = await getDocs(q);
    let total = 0;
    
    if (snapshot.empty) {
      expenseList.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">No expenses found. Add your first expense!</p>`;
      totalAmountElem.textContent = `Total: ${formatCurrency(0)}`;
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const dateObj = data.date.toDate();
      const monthYear = dateObj.toISOString().slice(0, 7);
      
      if (!month || monthYear === month) {
        // Create expense item
        const li = document.createElement('li');
        li.className = 'expense-item';
        
        // Create details section
        const details = document.createElement('div');
        details.className = 'details';
        
        const desc = document.createElement('span');
        desc.className = 'desc';
        desc.textContent = data.desc;
        
        const date = document.createElement('span');
        date.className = 'date';
        date.textContent = formatDate(data.date);
        
        details.appendChild(desc);
        details.appendChild(date);
        
        // Create right content
        const rightContent = document.createElement('div');
        rightContent.className = 'right-content';
        
        const category = document.createElement('span');
        category.className = `category ${data.category}`;
        category.textContent = data.category;
        
        const amount = document.createElement('span');
        amount.className = 'amount';
        amount.textContent = formatCurrency(data.amount);
        
        rightContent.appendChild(category);
        rightContent.appendChild(amount);
        
        // Create action buttons
        const actions = document.createElement('div');
        actions.className = 'expense-actions';
        
        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.innerHTML = '<i class="fas fa-edit"></i> Edit';
        editButton.onclick = () => handleEdit(doc.id, data);
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete';
        deleteButton.onclick = () => handleDelete(doc.id);
        
        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
        
        rightContent.appendChild(actions);
        
        // Append all sections to the list item
        li.appendChild(details);
        li.appendChild(rightContent);
        
        expenseList.appendChild(li);
        total += data.amount;
      }
    });

    totalAmountElem.textContent = `Total: ${formatCurrency(total)}`;
  } catch (error) {
    console.error("Error loading expenses:", error);
    expenseList.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">Error loading expenses. Please try again.</p>`;
  }
}

// Filter Expenses by Month
window.filterByMonth = function () {
  const selectedMonth = document.getElementById('monthPicker').value;
  loadExpenses(selectedMonth);
};

// Handle Expense Deletion
async function handleDelete(id) {
  if (!confirm("Are you sure you want to delete this expense?")) return;
  
  const expenseRef = doc(db, 'expenses', id);
  try {
    await deleteDoc(expenseRef);
    console.log("Expense deleted successfully");
    loadExpenses(); // Refresh the expense list after deletion
    updateSummaryData(); // Update the summary data
  } catch (error) {
    console.error("Error deleting expense: ", error);
    alert("Failed to delete expense. Please try again.");
  }
}

// Handle Expense Editing - Modal approach could be better but this is simpler
async function handleEdit(id, data) {
  const newDesc = prompt("Edit description", data.desc);
  if (newDesc === null) return; // User cancelled
  
  const newAmount = prompt("Edit amount", data.amount);
  if (newAmount === null) return; // User cancelled
  
  const newCategory = prompt("Edit category (Food, Travel, Health, Shopping, Bills, Entertainment, Other)", data.category);
  if (newCategory === null) return; // User cancelled

  if (newDesc && !isNaN(parseFloat(newAmount)) && newCategory) {
    try {
      const expenseRef = doc(db, 'expenses', id);
      await updateDoc(expenseRef, {
        desc: newDesc,
        amount: parseFloat(newAmount),
        category: newCategory
      });

      console.log("Expense updated successfully");
      loadExpenses(); // Refresh the expense list after update
      updateSummaryData(); // Update the summary data
    } catch (error) {
      console.error("Error updating expense: ", error);
      alert("Failed to update expense. Please try again.");
    }
  } else {
    alert("Invalid input. Please ensure amount is a number.");
  }
}

// Calculate and update summary data
async function updateSummaryData() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // Get monthly income from user document
    let totalIncome = 0;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      totalIncome = userData.monthlyIncome || 0;
    }

    // Get expenses
    const q = query(collection(db, 'expenses'), where('uid', '==', user.uid));
    const snapshot = await getDocs(q);
    
    let totalExpense = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      totalExpense += data.amount;
    });
    
    const balance = totalIncome - totalExpense;
    
    // Update summary cards
    document.getElementById('total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('total-expense').textContent = formatCurrency(totalExpense);
    
    // Update safe to spend in the circular chart
    document.getElementById('safe-amount').textContent = formatCurrency(balance);
    
    // Update circular chart percentage
    const expensePercent = totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0;
    const safePercent = 100 - expensePercent;
    
    const circleElement = document.querySelector('.circle.safe-circle');
    circleElement.setAttribute('stroke-dasharray', `${safePercent}, 100`);
    
  } catch (error) {
    console.error("Error updating summary data:", error);
  }
}

// Initialize month picker with current month
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const month = now.getMonth() + 1; // getMonth() returns 0-11
  const year = now.getFullYear();
  
  const monthStr = month < 10 ? `0${month}` : month;
  document.getElementById('monthPicker').value = `${year}-${monthStr}`;
});

// Handle "Get Started" button click
document.getElementById('get-started-btn').addEventListener('click', () => {
  document.getElementById('landing-section').style.display = 'none';
  document.getElementById('auth-section').style.display = 'block';
});