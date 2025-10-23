import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-suppliers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatTableModule],
  templateUrl: './suppliers.component.html',
})
export class AdminSuppliersComponent implements OnInit {
  cols = ['name', 'taxId', 'email'];
  suppliers: any[] = [];
  form: any;
  private readonly api = `${environment.apiUrl}/suppliers`;
  
  constructor(private fb: FormBuilder, private toastr: ToastrService, private http: HttpClient) {
    this.form = this.fb.group({ 
      name: ['', Validators.required], 
      taxId: [''], 
      email: [''] 
    });
  }
  ngOnInit(){ this.load(); }
  load(){ this.http.get<any[]>(this.api).subscribe(rows=> this.suppliers = rows); }
  create(){
    if(this.form.invalid) return;
    this.http.post(this.api, this.form.value).subscribe(()=>{ this.toastr.success('Proveedor agregado'); this.form.reset(); this.load(); });
  }
}


