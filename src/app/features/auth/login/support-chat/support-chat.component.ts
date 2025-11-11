import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
    selector: 'app-support-chat',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatIconModule
    ],
    templateUrl: './support-chat.component.html',
    styleUrl: './support-chat.component.scss'
})
export class SupportChatComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Output() closeEvent = new EventEmitter<void>();

  supportForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService
  ) {
    this.supportForm = this.fb.group({
      nombre: ['', [Validators.required]],
      cargo: ['', [Validators.required]],
      empresaCliente: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Si el modal está abierto, resetear el formulario
    if (this.isOpen) {
      this.supportForm.reset();
    }
  }

  closeSupportChat(): void {
    this.supportForm.reset();
    this.closeEvent.emit();
    this.playSound('click');
  }

  onSubmitSupport(): void {
    if (this.supportForm.valid) {
      // Aquí puedes enviar el formulario a tu backend o servicio de soporte
      const supportData = this.supportForm.value;
      console.log('Support request:', supportData);
      
      // Simulación de envío
      this.notificationService.success('Solicitud enviada. Nos pondremos en contacto pronto.');
      this.closeSupportChat();
      this.playSound('success');
    } else {
      this.notificationService.error('Por favor, complete todos los campos');
      this.playSound('error');
    }
  }

  private playSound(type: 'success' | 'error' | 'click'): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const soundConfig = {
        success: { frequency: 800, duration: 0.15, volume: 0.08 },
        error: { frequency: 300, duration: 0.25, volume: 0.1 },
        click: { frequency: 1000, duration: 0.08, volume: 0.06 }
      };
      
      const config = soundConfig[type];
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(config.volume, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + config.duration);
      oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + config.duration);
    } catch (error) {
      console.debug('Audio not supported');
    }
  }
}
