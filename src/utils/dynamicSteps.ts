
import { FormStep, FormStepData } from '../types/multiStepForm';
import { FORM_STEPS } from '../config/formSteps';

export class DynamicStepGenerator {
  private stepData: FormStepData;
  private generatedSteps: FormStep[] = [];

  constructor(stepData: FormStepData) {
    this.stepData = stepData;
    this.generateSteps();
  }

  private generateSteps() {
    this.generatedSteps = [];

    // Add all base steps
    FORM_STEPS.forEach(section => {
      section.steps.forEach(step => {
        this.generatedSteps.push(step);
        
        // Repeater steps are now handled inline in StepInput, no need to add separate steps
      });
    });

    // Add conditional spouse steps
    if (this.stepData.maritalStatus === 'verheiratet') {
      const spouseSteps = this.generateSpouseSteps();
      const maritalIndex = this.generatedSteps.findIndex(s => s.id === 'maritalStatus');
      this.generatedSteps.splice(maritalIndex + 1, 0, ...spouseSteps);
    }
  }

  private generateSpouseSteps(): FormStep[] {
    return [
      {
        id: 'spouseFirstName',
        title: 'Wie lautet der Vorname deines Ehepartners?',
        type: 'text',
        placeholder: 'Vorname des Ehepartners',
        explanation: 'Bei einer gemeinsamen Steuererklärung werden die Daten beider Ehepartner benötigt.',
        validation: { required: true, message: 'Vorname des Ehepartners ist erforderlich' }
      },
      {
        id: 'spouseLastName',
        title: 'Wie lautet der Nachname deines Ehepartners?',
        type: 'text',
        placeholder: 'Nachname des Ehepartners',
        validation: { required: true, message: 'Nachname des Ehepartners ist erforderlich' }
      },
      {
        id: 'spouseReligion',
        title: 'Welcher Religion gehört dein Ehepartner an?',
        type: 'select',
        options: ['römisch-katholisch', 'reformiert', 'christkatolisch', 'andere/keine'],
        explanation: 'Die Religionszugehörigkeit des Ehepartners beeinflusst ebenfalls die Kirchensteuern.',
        validation: { required: true, message: 'Religion des Ehepartners ist erforderlich' }
      }
    ];
  }

  private generateChildrenSteps(): FormStep[] {
    return [
      {
        id: 'childrenRepeater',
        title: 'Füge deine Kinder hinzu',
        type: 'repeater',
        explanation: 'Für jeden Kinderabzug benötigen wir die Angaben des Kindes.',
        validation: { required: true, message: 'Mindestens ein Kind muss hinzugefügt werden' }
      }
    ];
  }

  private generateEmployerSteps(): FormStep[] {
    return [
      {
        id: 'employerRepeater',
        title: 'Füge deine Arbeitgeber hinzu',
        type: 'repeater',
        explanation: 'Für jeden Arbeitgeber benötigen wir separate Angaben.',
        validation: { required: true, message: 'Mindestens ein Arbeitgeber muss hinzugefügt werden' }
      }
    ];
  }

  private generateVehicleSteps(): FormStep[] {
    return [
      {
        id: 'vehicleRepeater',
        title: 'Füge deine Fahrzeuge hinzu',
        type: 'repeater',
        explanation: 'Jedes Fahrzeug muss separat erfasst werden.',
        validation: { required: true, message: 'Mindestens ein Fahrzeug muss hinzugefügt werden' }
      }
    ];
  }

  public getSteps(): FormStep[] {
    return this.generatedSteps;
  }

  public updateStepData(newStepData: FormStepData) {
    this.stepData = newStepData;
    this.generateSteps();
  }
}
